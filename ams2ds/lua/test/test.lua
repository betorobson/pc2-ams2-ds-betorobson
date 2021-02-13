-- Config test.
local addon_storage = ...

--print( "id_to_track:" ); dump( id_to_track, "  " )
--print( "name_to_track:" ); dump( name_to_track, "  " )
--print( "Damage:" ); dump( Damage, "  " )
--print( "SessionFlags:" ); dump( SessionFlags, "  " )
--print( "Callbacks:" ); dump( Callback, "  " )

local to_kick = {}

function autokick( refId, delay )
	print( "Automatically kicking " .. refId .. " in " .. tostring( delay ) .. " milliseconds" )
	to_kick[ refId ] = GetServerUptimeMs() + delay
end

function log_session_track_change( dirty_attributes )
	for _,name in ipairs( dirty_attributes ) do
		if name == "TrackId" then
			local track_id = session.attributes.TrackId
			local track = id_to_track[ track_id ]
			if track then
				print( "Session changed track to " .. track.name .. " (id " .. track_id .. ")" )
			else
				print( "Session changed track to unknown track with id " .. track_id )
			end
		end
	end
end

local first_event_offset = 0

function remember_event_offset()
	local log_info = GetEventLogInfo()
	first_event_offset = log_info.first + log_info.count - 1
	print( "Session created, first log event index = " .. first_event_offset )
end

function log_events()
	print( "Dumping log for session, starting at " .. first_event_offset )
	local log = GetEventLogRange( first_event_offset )
	for _,event in ipairs( log.events ) do
		print( "Event: " )
		dump( event, "  " )
	end
	first_event_offset = log.first + log.count
end

function tick()
	local now = GetServerUptimeMs()
	for refId, time in pairs( to_kick ) do
		if now >= time then
			print( "Kicking " .. refId )
			KickMember( refId )
			to_kick[ refId ] = nil
		end
	end
end

function callback_test( callback, ... )
	if callback == Callback.Tick then
		tick()
		return
	end

	-- Ignore the rest
	do return end

	-- Participant lap times test.
	if callback == Callback.EventLogged then
		local event = ...
		if event.type == "Participant" and event.name == "Lap" then
			local participantid = event.participantid
			local participant = session.participants[ participantid ]
			print( "Participant " .. participant.attributes.Name .. " (" .. participantid .. ") lap:" )
			dump( event.attributes )
		end
	end

	if callback == Callback.ParticipantAttributesChanged then
		local participantid, attrlist = ...
		local participant = session.participants[ participantid ]
		local attrset = table.list_to_set( attrlist )
		if attrset.CurrentLap then
			print( "Participant " .. participant.attributes.Name .. " (" .. participantid .. ") entering lap " .. participant.attributes.CurrentLap )
		end
		if attrset.FastestLapTime then
			print( "Participant " .. participant.attributes.Name .. " (" .. participantid .. ") new fastest lap time: " .. participant.attributes.FastestLapTime )
		end
		if attrset.RacePosition then
			print( "Participant " .. participant.attributes.Name .. " (" .. participantid .. ") new race position: " .. participant.attributes.RacePosition )
		end
	end

	-- Dump events for whole session when it ends.
	if callback == Callback.EventLogged then
		local event = ...
		if ( event.type == "Session" ) and ( event.name == "SessionCreated" ) then
			remember_event_offset()
		elseif ( event.type == "Session" ) and ( event.name == "SessionDestroyed" ) then
			log_events()
		end
	end

	-- Testing/loggin.
	print( "Callback fired - " .. value_to_callback[ callback ] )
	if callback == Callback.ServerStateChanged then
		local oldState, newState = ...
		print( "Server state changed from " .. oldState .. " to " .. newState )
		--print( "Server: " ); dump( server, "  " )
		--print( "Session: " ); dump( session, "  " )
	elseif callback == Callback.SessionManagerStateChanged then
		local oldState, newState = ...
		print( "Session manager state changed from " .. oldState .. " to " .. newState )
		--dump( session )
	elseif callback == Callback.SessionAttributesChanged then
		local dirtyList = ...
		print( "Changed attributes: " )
		for _, name in ipairs( dirtyList ) do
			print( "- " .. name .. " = " .. tostring( session.attributes[ name ] ) )
		end
		--dump( session )
	elseif callback == Callback.MemberJoined then
		local refId = ...
		local name = session.members[ refId ].name;
		print( "Member " .. name .. " (" .. refId ..") has joined" )
		dump( session.members[ refId ], "  " )
		--autokick( refId, 10000 )
	elseif callback == Callback.MemberStateChanged then
		local refId, oldState, newState = ...
		local name = session.members[ refId ].name;
		print( "Member " .. name .. " (" .. refId ..") changed state from " .. oldState .. " to " .. newState )
	elseif callback == Callback.MemberAttributesChanged then
		local refId, dirtyList = ...
		local member = session.members[ refId ]
		local name = member.name;
		print( "Member " .. name .. " (" .. refId ..") changed attributes:" )
		for _, name in ipairs( dirtyList ) do
			print( "- " .. name .. " = " .. tostring( member.attributes[ name ] ) )
		end
	elseif callback == Callback.HostMigrated then
		local refId = ...
		local name = session.members[ refId ].name;
		print( "Host migrated to " .. name .. " (" .. refId ..")" )
	elseif callback == Callback.MemberLeft then
		local refId = ...
		local name = session.members[ refId ].name;
		print( "Member " .. name .. " (" .. refId ..") has left" )
	elseif callback == Callback.ParticipantCreated then
		local participantId = ...
		local participant = session.participants[ participantId ]
		local owner = session.members[ participant.attributes.RefId ]
		local ownerName = "unknown"
		if owner then
			ownerName = owner.name
		end
		print( "Participant " .. participantId .. " has been created, owned by member " .. ownerName )
		dump( participant )
	elseif callback == Callback.ParticipantAttributesChanged then
		local participantId, dirtyList = ...
		local participant = session.participants[ participantId ]
		print( "Participant " .. participantId .. " changed attributes:" )
		for _, name in ipairs( dirtyList ) do
			print( "- " .. name .. " = " .. tostring( participant.attributes[ name ] ) )
		end
	elseif callback == Callback.ParticipantRemoved then
		local participantId = ...
		local name = session.members[ refId ].name;
		print( "Participant " .. participantId .. " has been removed" )
	elseif callback == Callback.EventLogged then
		local event = ...
		print( "Event: " )
		dump( event, "  " )
	end
end

RegisterCallback( callback_test )
EnableCallback( Callback.Tick )
EnableCallback( Callback.ServerStateChanged )
EnableCallback( Callback.SessionManagerStateChanged )
EnableCallback( Callback.SessionAttributesChanged )
EnableCallback( Callback.NextSessionAttributesChanged )
EnableCallback( Callback.MemberJoined )
EnableCallback( Callback.MemberStateChanged )
EnableCallback( Callback.MemberAttributesChanged )
EnableCallback( Callback.HostMigrated )
EnableCallback( Callback.MemberLeft )
EnableCallback( Callback.ParticipantCreated )
EnableCallback( Callback.ParticipantAttributesChanged )
EnableCallback( Callback.ParticipantRemoved )
EnableCallback( Callback.EventLogged )

-- EOF --
