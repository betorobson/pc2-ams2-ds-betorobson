--[[

Simple "message of the day" addon.

It sends a welcome message to all new joining members, and also can send lobby setup to new joining members
and to everyone after returning back to lobby when a race finishes.

--]]

local addon_storage = ...
local config = addon_storage.config

local motd = config.motd
if motd == "" then motd = nil end
config.send_setup = config.send_setup or {}
local send_setup = table.list_to_set( config.send_setup )
local send_when_returning_to_lobby = config.send_when_returning_to_lobby or false


-- Map from refid to send timer (GetServerUptimeMs)
local scheduled_sends = {}


-- Immediate send to given refid
local function send_now( refid )

	local attributes = session.attributes

	-- Send the message
	if motd then
		SendChatToMember( refid, motd )
	else
		local privacy = attributes.Privacy
		if privacy == 0 then privacy = "public"
		elseif privacy == 1 then privacy = "friends only"
		else privacy = "private"
		end
		local password = server.password_protected and " (password protected)" or ""
		SendChatToMember( refid, "Welcome to '" .. server.name .. "' ; this server is " .. privacy .. password )
	end

	-- Send the controls setup setup
	if send_setup.controls then
		SendChatToMember( refid, "Server controls this game's setup: " .. ( ( attributes.ServerControlsSetup ~= 0 ) and "yes" or "no" ) )
	end
	if attributes.ServerControlsSetup == 0 then
		return
	end

	if send_setup.controls then
		if attributes.ServerControlsTrack ~= 0 then
			local track_id = attributes.TrackId
			local track = id_to_track[ track_id ]
			local track_name = track and track.name or track_id
			SendChatToMember( refid, "Server restricts the track to " .. track_name )
		end

		if attributes.ServerControlsVehicle ~= 0 then
			local vehicle_id = attributes.VehicleModelId
			local vehicle = id_to_vehicle[ vehicle_id ]
			local vehicle_name = vehicle and vehicle.name or vehicle_id
			SendChatToMember( refid, "Server restricts the vehicle to " .. vehicle_name )
		elseif attributes.ServerControlsVehicleClass ~= 0 then
			local vehicle_class_id = attributes.VehicleClassId
			local vehicle_class = id_to_vehicle_class[ vehicle_class_id ]
			local vehicle_class_name = vehicle_class and vehicle_class.name or vehicle_class_id
			SendChatToMember( refid, "Server restricts the vehicle class to " .. vehicle_class_name )
		end
	end

	-- Send race format.
	if send_setup.format then
		local phases = {}
		if attributes.PracticeLength ~= 0 then
			table.insert( phases, "practice (" .. attributes.PracticeLength .. " minutes)" )
		end
		if attributes.QualifyLength ~= 0 then
			table.insert( phases, "qualify (" .. attributes.QualifyLength .. " minutes)" )
		end
		if attributes.RaceLength ~= 0 then
			table.insert( phases, "race (" .. attributes.RaceLength .. " laps)" )
		end
		-- Note: TODO: time-based race format
		SendChatToMember( refid, "Race format: " .. table.concat( phases, ", " ) )
	end

	-- Send race restrictions
	if send_setup.restrictions then
		local restricts = {}
		SendChatToMember( refid, "Restrictions:" )

		if attributes.AllowedViews == AllowedView.NONE then table.insert( restricts, "Force interior view: NO" )
		elseif attributes.AllowedViews == AllowedView.CockpitHelmet then table.insert( restricts, "Force interior view: YES" )
		end
		if ( attributes.Flags & SessionFlags.FORCE_MANUAL ) ~= 0 then table.insert( restricts, "Force manual gears: YES" ) else table.insert( restricts, "Force manual gears: NO" ) end
		if ( attributes.Flags & SessionFlags.FORCE_REALISTIC_DRIVING_AIDS ) ~= 0 then table.insert( restricts, "Force realistic aids: YES" ) else table.insert( restricts, "Force realistic aids: NO" ) end
		if ( attributes.Flags & SessionFlags.ALLOW_CUSTOM_VEHICLE_SETUP ) ~= 0 then table.insert( restricts, "Force default setup: NO" ) else table.insert( restricts, "Force default setup: YES" ) end
		SendChatToMember( refid, "- " .. table.concat( restricts, ", " ) )

		restricts = {}
		if ( attributes.Flags & SessionFlags.ABS_ALLOWED ) ~= 0 then table.insert( restricts, "Allow ABS: YES" ) else table.insert( restricts, "Allow ABS: NO" ) end
		if ( attributes.Flags & SessionFlags.SC_ALLOWED ) ~= 0 then table.insert( restricts, "Allow stability control: YES" ) else table.insert( restricts, "Allow stability control: NO" ) end
		if ( attributes.Flags & SessionFlags.TCS_ALLOWED ) ~= 0 then table.insert( restricts, "Allow traction control: YES" ) else table.insert( restricts, "Allow traction control: NO" ) end
		SendChatToMember( refid, "- " .. table.concat( restricts, ", " ) )

		restricts = {}
		if attributes.DamageType == Damage.OFF then table.insert( restricts, "Damage: OFF" )
		elseif attributes.DamageType == Damage.VISUAL_ONLY then table.insert( restricts, "Damage: VISUAL" )
		elseif attributes.DamageType == Damage.PERFORMANCEIMPACTING then table.insert( restricts, "Damage: PERFORMANCE" )
		elseif attributes.DamageType == Damage.FULL then table.insert( restricts, "Damage: FULL" )
		end
		if ( attributes.Flags & SessionFlags.MECHANICAL_FAILURES ) ~= 0 then table.insert( restricts, "Mechanical failures: YES" ) else table.insert( restricts, "Mechanical failures: NO" ) end
		if attributes.TireWearType == TireWear.OFF then table.insert( restricts, "Tire wear: OFF" )
		elseif attributes.TireWearType == TireWear.SLOW then table.insert( restricts, "Tire wear: SLOW" )
		elseif attributes.TireWearType == TireWear.STANDARD then table.insert( restricts, "Tire wear: STANDARD" )
		else table.insert( restricts, "Tire wear: " .. value_to_tire_wear[ attributes.TireWearType ] )
		end
		if attributes.FuelUsageType == FuelUsage.OFF then table.insert( restricts, "Fuel usage: OFF" )
		elseif attributes.FuelUsageType == FuelUsage.SLOW then table.insert( restricts, "Fuel usage: SLOW" )
		elseif attributes.FuelUsageType == FuelUsage.STANDARD then table.insert( restricts, "Fuel usage: STANDARD" )
		end
		SendChatToMember( refid, "- " .. table.concat( restricts, ", " ) )

		restricts = {}
		if ( attributes.Flags & SessionFlags.AUTO_START_ENGINE ) ~= 0 then table.insert( restricts, "Auto start engine: YES" ) else table.insert( restricts, "Auto start engine: NO" ) end
		if attributes.PenaltiesType == Penalties.NONE then table.insert( restricts, "Penalties: NONE" )
		elseif attributes.PenaltiesType == Penalties.FULL then table.insert( restricts, "Penalties: FULL" )
		end
		SendChatToMember( refid, "- " .. table.concat( restricts, ", " ) )
	end

	-- Send weather
	if send_setup.weather then
		local weather = {}
		if attributes.RaceWeatherSlots == 0 then
			table.insert( weather, "Real Weather" )
		else
			for i = 1,attributes.RaceWeatherSlots do
				local wvalue = attributes[ "RaceWeatherSlot" .. i ]
				local wname = value_to_weather[ wvalue ] or tostring( wvalue )
				table.insert( weather, wname )
			end
		end
		SendChatToMember( refid, "Weather: " .. table.concat( weather, " -> " ) )
	end

	-- Send start time
	if send_setup.date then
		SendChatToMember( refid, "Starting time: " .. attributes.RaceDateHour .. ":00" )
	end
end


-- The tick that processes all queued sends
local function tick()
	local now = GetServerUptimeMs()
	for refid,time in pairs( scheduled_sends ) do
		if now >= time then
			send_now( refid )
			scheduled_sends[ refid ] = nil
		end
	end
end


-- Request send to given refid, or all session members if refid is not specified.
local function send_motd_to( refid )
	local send_time = GetServerUptimeMs() + 2000
	if refid then
		scheduled_sends[ refid ] = send_time
	else
		for k,_ in pairs( session.members ) do
			scheduled_sends[ k ] = send_time
		end
	end
end


-- Main addon callback
local function addon_callback( callback, ... )

	-- Regular tick
	if callback == Callback.Tick then
		tick()
	end

	-- Welcome new members.
	if callback == Callback.MemberStateChanged then
		local refid, _, new_state = ...
		if new_state == "Connected" then
			send_motd_to( refid )
		end
	end

	-- Handle session state change back to lobby
	if callback == Callback.EventLogged then
		local event = ...
		if ( event.type == "Session" ) and ( event.name == "StateChanged" ) then
			if ( event.attributes.PreviousState ~= "None" ) and ( event.attributes.NewState == "Lobby" ) then
				if send_when_returning_to_lobby then
					send_motd_to()
				end
			end
		end
	end
end


-- Main
RegisterCallback( addon_callback )
EnableCallback( Callback.Tick )
EnableCallback( Callback.MemberStateChanged )
if send_when_returning_to_lobby then
	EnableCallback( Callback.EventLogged )
end


-- EOF --
