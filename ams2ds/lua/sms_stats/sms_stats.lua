--[[

Stats tracking addon.

The stats are stored persistently in the data and therefore survive server restarts. The persistent storage
available as sms_stats global in Lua. Other addons can therefore read and use it - but they should not modify it.
The sms_stats table has these sub-tables:

1. server
- name: Current server name
- uptime: Current server uptime, in seconds
- total_uptime: Total server uptime, in seconds
- steam_disconnects: Number of times disconnected from Steam
- steam_downtime: Current number of seconds while disconnected from Steam, out of the "uptime" seconds
- total_steam_downtime: Total number of seconds while disconnected from Steam, out of the "total_uptime" seconds

2. session
- counts: Various counters for
  - sessions: Number of sessions started on the server
  - lobbies: Number of lobbies started on the server (unlike sessions, returning back after race counts as another lobby)
  - stage_counts: Table with practice1, practice2, qualifying, warmup, race1: Number of race stages started
  - stage_durations: Table with practice1, practice2, qualifying, warmup, race1: Total playtime durations in seconds of individual stages.
    If a race is setup with stages but the session is quit before the stage is reached, that stage will not be counted here
  - race_loads: Lobby->loading transitions
  - race_loads_done: Loading->race transitions
  - race_finishes: Final race stage done, if lower than loads, those sessions ended prematurely
  - player_loads: Number of players during lobby->loading transitions
  - player_loads_done: Number of players during loading->race transitions (lower than loads -> disconnects while loading)
  - player_finishes: Number of players when the race finished (lower than finishes -> early leaves or disconnects during race)
  - tracks: Map from track id to the number of times the track was active while loading
  - track_distances: Map from track id to the number of meters travelled on the (over all player participants)
  - vehicles: Map from vehicle id to the number of times the vehicle was used while loading ; TODO: does not count JIP yet
  - vehicle_distances: Map from vehicle id to the number of meters travelled in the vehicle (updated each lap)

3. players: Map from player SteamID to
- name: Last known Steam name
- last_joined: Unix UTC time in seconds of the last time the player joined the server
- counts: Various counters for
  - race_joins: Number of times joined the server
  - race_loads: Number of lobby->loading transitions
  - race_loads_done: Number of loading->race transitions
  - race_finishes: Number of fully finished races
  - tracks: Map from track id to the number of times the player loaded onto this track ; TODO: does not count JIP
  - track_distances: Map from track id to the number of meters the player travelled on this track (updated each lap)
  - vehicles: Map from vehicle id to the number of times the player loaded in this vehicle ; TODO: does not count JIP
  - vehicle_distances: Map from vehicle id to the number of meters the player travelled in the vehicle (updated each lap)
  - qualify: Table with counters for qualification results of the player:
    - states: Map from state name at the end of qualification to counter for that state
    - positions: Map from qualifying positions to counter for that position
    - positions_per_size: Map from number of players at the end of qualifycation, to map from qualifying positions to counters
  - race: Table with counters for race results of the player:
    - states, positions, positions_per_size: Same as the qualification table

4. history: Array with games ran on the server.
For now the addon does not perform any cleanup of this array, all sessions will be stored here.
Each element of the array is a structure containing:
- index: Unique index assigned to this record.
- start_time: Unix UTC timestamp when the lobby for the game was created.
- end_time: Unix UTC timestamp when the game finished.
- finished: True if the game fully finished and loaded back to lobby, false if the game finished prematurely.
- setup: Setup attributes of the game, recorded when it starts loading. All writable attributes are stored here.
- members: Members of the session, map from refid to:
  - index, steamid, name: Basic member details
  - join_time: Time when the member joined the session.
  - leave_time: Time when the member left the session.
  - participantid: Id of the member's player participant.
  - setup: Member's attributes VehicleId, LiveryId, RaceStatFlags
- participants: Participants who were present during this session, map from participant id to structure with these attributes:
  RefId, Name, IsPlayer, VehicleId, LiveryId
- stages: Map from stage name to structure with the stage details:
  - start_time, end_time: Start and end time.
  - events: Array of participant events related to the stage. Each event has 'event_name', 'time', 'participantid' and 'attributes'
    with the event details, as well as 'name', 'refid' and 'is_player' with useful participant details.
    Events that are recorded here are: Lap, State, Impact, CutTrackStart, CutTrackEnd.
  - results: Array of Results events, each with 'time', 'participantid' and 'attributes' ; and 'name', 'refid' and 'is_player'.

Internal data: Additional fields are available in the addon data table (not the sms_stats table), internal to the addon
- next_history_index: Next index to assign to history record.

Numeric values are set to -1 when they are not properly initialized yet.
  
All attributes are stored as integers, no stringification is applied. In the future this addon will most likely
provide a HTTP API endpoint with optional stringification there.

--]]

local addon_storage = ...

-- Grab config.
local config = addon_storage.config
if type( config.history_length ) ~= "number" then
	config.history_length = 50
end


-- Remember and normalize the persistent data.
-- Because the DS does not support non-string keys in maps, all stat tables indexed by player's SteamID, track id, or vehicle id
-- will have the keys stringified. After load we fix them up to integers/numbers, so the rest of the addon won't have to deal
-- with type conversion (dump_typed really helps with debugging these problems)
local addon_data = addon_storage.data
local intkey_table_names = { players = true, members = true, participants = true, tracks = true, track_distances = true, vehicles = true, vehicle_distances = true, positions = true, positions_per_size = true }
addon_data = table.deep_copy_normalized( addon_data, intkey_table_names )
addon_storage.data = addon_data


-- The stats global (and useful local shortcuts)
if not addon_data.stats then addon_data.stats = {} end
sms_stats = addon_data.stats

local sms_stats = sms_stats
local server_stats = sms_stats.server or {} ; sms_stats.server = server_stats
local session_stats = sms_stats.session or {} ; sms_stats.session = session_stats
local session_counts = session_stats.counts or {} ; session_stats.counts = session_counts
if session_stats.history then session_stats.history = nil end
local player_stats = sms_stats.players or {} ; sms_stats.players = player_stats
local history_stats = sms_stats.history or {} ; sms_stats.history = history_stats


-- Enable debugging prints?
local debug = false


-- Various times, move to config?
local TICK_UPDATE_DELTA_MS = 1000
local ACTIVE_AUTOSAVE_DELTA_MS = 2 * 60 * 1000
local IDLE_AUTOSAVE_DELTA_MS = 15 * 60 * 1000


-- Current state
local connected_to_steam = false
local server_state = "Idle"
local session_manager_state = "Idle"
local session_game_state = "None"
local session_stage = nil
local locase_session_stage = nil
local session_stage_change_time = nil
local current_history = nil
local current_history_stage = nil
local last_update_time = nil
local last_save_time = nil


-- "Forward declarations" of all local functions, to prevent issues with definition vs calling order.
-- Please maintain this in the same order as the function definitions.
-- Yes, it does not look nice, and if the names here do not match the actual function names exactly, the mismatching definitions will become global functions.
-- Yes, Lua is an ugly language.
local save
local start
local tick
local cleanup_history
local prepare_history_index
local extract_history_setup
local extract_history_member
local update_history_member
local extract_history_participant
local update_history_participant
local extract_history_member_participantids
local extract_current_history
local handle_common_session_lobby
local handle_new_session_lobby
local handle_returning_session_lobby
local handle_stage_started
local handle_stage_finished
local handle_session_loading
local handle_session_loaded
local handle_session_finished_prematurely
local handle_session_finished
local handle_session_game_state_change
local handle_session_stage_change
local handle_server_state_change
local handle_session_manager_state_change
local handle_session_attributes
local handle_player_joined
local handle_player_left
local handle_member_attributes
local handle_participant_created
local handle_participant_attributes
local handle_participant_lap
local handle_participant_results
local handle_participant_history_event
local handle_participant_history_results
local addon_callback


-- Save the config
function save()
	if not last_update_time then
		return
	end
	cleanup_history()
	SavePersistentData()
	last_save_time = GetServerUptimeMs()
end


-- Start tracking the stats
function start()
	if debug then print( "sms_stats: Starting" ) end
	local changed = false

	connected_to_steam = server.connected_to_steam
	server_state = server.state or "Idle"
	session_manager_state = session.manager_state or "Idle"
	session_game_state = session.attributes.SessionState or "None"
	session_stage = session.attributes.SessionStage
	locase_session_stage = session_stage:lower()
	last_update_time = GetServerUptimeMs()

	if server_stats.name ~= server.name then
		changed = true
		server_stats.name = server.name
	end
	server_stats.uptime = 0
	if not server_stats.total_uptime then server_stats.total_uptime = 0; changed = true end
	if not server_stats.steam_disconnects then server_stats.steam_disconnects = 0; changed = true end
	if not server_stats.steam_downtime then server_stats.steam_downtime = 0; changed = true end
	if not server_stats.total_steam_downtime then server_stats.total_steam_downtime = 0; changed = true end

	if not session_counts.sessions then session_counts.sessions = 0; changed = true end
	if not session_counts.lobbies then session_counts.lobbies = 0; changed = true end
	if not session_counts.stage_counts then session_counts.stage_counts = {}; changed = true end
	if not session_counts.stage_durations then session_counts.stage_durations = {}; changed = true end
	if not session_counts.race_loads then session_counts.race_loads = 0; changed = true end
	if not session_counts.race_loads_done then session_counts.race_loads_done = 0; changed = true end
	if not session_counts.race_finishes then session_counts.race_finishes = 0; changed = true end
	if not session_counts.player_loads then session_counts.player_loads = 0; changed = true end
	if not session_counts.player_loads_done then session_counts.player_loads_done = 0; changed = true end
	if not session_counts.player_finishes then session_counts.player_finishes = 0; changed = true end
	if not session_counts.tracks then session_counts.tracks = {}; changed = true end
	if not session_counts.track_distances then session_counts.track_distances = {}; changed = true end
	if not session_counts.vehicles then session_counts.vehicles = {}; changed = true end
	if not session_counts.vehicle_distances then session_counts.vehicle_distances = {}; changed = true end

	if cleanup_history() then changed = true end
	if prepare_history_index() then changed = true end

	if changed then save() end
end


-- Regular update tick.
function tick()
	-- No-op until started
	if not last_update_time then
		return
	end

	-- Check time elapsed, process only after 1s
	local now = GetServerUptimeMs()
	local delta_ms = now - last_update_time
	if delta_ms < TICK_UPDATE_DELTA_MS then
		return
	end
	local delta_secs = delta_ms / 1000
	last_update_time = now

	-- Update server stats
	server_stats.uptime = server_stats.uptime + delta_secs
	server_stats.total_uptime = server_stats.total_uptime + delta_secs
	if connected_to_steam ~= server.connected_to_steam then
		connected_to_steam = server.connected_to_steam
		if not connected_to_steam then
			server_stats.steam_disconnects = server_stats.steam_disconnects + 1
			server_stats.steam_downtime = server_stats.steam_downtime + delta_secs
			server_stats.total_steam_downtime = server_stats.total_steam_downtime + delta_secs
		end
	end

	-- Save if needed
	if not last_save_time then
		last_save_time = now
	end
	local save_delta_ms = now - last_save_time
	local autosave_delta_ms = IDLE_AUTOSAVE_DELTA_MS
	if server_state == "RunningActive" then
		autosave_delta_ms = ACTIVE_AUTOSAVE_DELTA_MS
	end
	if save_delta_ms > autosave_delta_ms then
		save()
	end
end


-- Remove old history entries if needed
function cleanup_history()
	if config.history_length < 0 then
		return false
	end

	local changed = false
	while #history_stats > config.history_length do
		table.remove( history_stats, 1 )
		changed = true
	end
	return changed
end


-- Initialize history indexing.
function prepare_history_index()
	local changed = false

	-- If the history is empty, just initialize the index if needed.
	if next( history_stats ) == nil then
		if not addon_data.next_history_index then
			addon_data.next_history_index = 1
			changed = true
		end
		return changed
	end

	-- Non-empty history, check if we need to set the indices, older version of the addon did not set this.
	local oldest_record = history_stats[ 1 ]
	if not oldest_record.index then
		for i,record in ipairs( history_stats ) do
			record.index = i
			changed = true
		end
	end

	-- Find the highest index.
	local highest_index = 0
	for _,record in ipairs( history_stats ) do
		if record.index and record.index > highest_index then
			highest_index = record.index
		end
	end

	if not addon_data.next_history_index or ( addon_data.next_history_index <= highest_index ) then
		addon_data.next_history_index = highest_index + 1
		changed = true
	end

	return changed
end


-- Extract session setup for history
function extract_history_setup()
	local s = {}
	for _,descriptor in ipairs( lists.attributes.session.list ) do
		if ( descriptor.access == "ReadWrite" ) or ( descriptor.access == "WriteOnly" ) then
			s[ descriptor.name ] = session.attributes[ descriptor.name ]
		end
	end
	return s
end


-- Extract information about session member for history.
function extract_history_member( member )
	return {
		index = member.index,
		steamid = member.steamid,
		name = member.name,
		join_time = GetUtcUnixTime(),
		leave_time = -1,
		participantid = -1,
		setup = {
			VehicleId = member.attributes.VehicleId,
			LiveryId = member.attributes.LiveryId,
			RaceStatFlags = member.attributes.RaceStatFlags,
		}
	}
end


-- Update history member's setup.
function update_history_member( member )
	if not current_history then
		return
	end

	local m = current_history.members[ member.refid ]
	if m then
		local s = m.setup
		s.VehicleId = member.attributes.VehicleId
		s.LiveryId = member.attributes.LiveryId
		s.RaceStatFlags = member.attributes.RaceStatFlags
	end
end


-- Extract information about session participant for history.
function extract_history_participant( participant )
	return {
		RefId = participant.attributes.RefId,
		Name = participant.attributes.Name,
		IsPlayer = participant.attributes.IsPlayer,
		VehicleId = participant.attributes.VehicleId,
		LiveryId = participant.attributes.LiveryId,
	}
end


-- Update history participant's setup.
function update_history_participant( participant )
	if not current_history then
		return
	end

	local p = current_history.participants[ participant.id ]
	if p then
		local member_changed = ( p.RefId ~= participant.attributes.RefId ) or ( p.IsPlayer ~= participant.attributes.IsPlayer )
		p.RefId = participant.attributes.RefId
		p.Name = participant.attributes.Name
		p.IsPlayer = participant.attributes.IsPlayer
		p.VehicleId = participant.attributes.VehicleId
		p.LiveryId = participant.attributes.LiveryId
		if member_changed then
			extract_history_member_participantids()
		end
	end
end


-- Update history members participantid fields from history participants.
function extract_history_member_participantids()
	if not current_history then
		return
	end

	local members = current_history.members
	local participants = current_history.participants
	for participantid,participant in pairs( participants ) do
		if participant.IsPlayer ~= 0 then
			local refid = participant.RefId
			local member = members[ refid ]
			if member and member.participantid < 0 then
				member.participantid = participantid
			end
		end
	end
end


-- Extract basic information about the session for history, overwriting almost everything in current_history
function extract_current_history()
	if not current_history then
		return
	end

	if debug then print( "sms_stats: extract_current_history" ) end
	current_history.setup = extract_history_setup()
	current_history.members = {}
	for refid,member in pairs( session.members ) do
		current_history.members[ refid ] = extract_history_member( member )
	end
	current_history.participants = {}
	for participantid,participant in pairs( session.participants ) do
		current_history.participants[ participantid ] = extract_history_participant( participant )
	end
	extract_history_member_participantids()
end


-- Session - new lobby created, or returned back to lobby
function handle_common_session_lobby()
	session_counts.lobbies = session_counts.lobbies + 1

	-- Prepare new history entry.
	if config.history_length == 0 then
		current_history = nil
	else
		current_history = {
			index = addon_data.next_history_index,
			start_time = GetUtcUnixTime(),
			end_time = 0,
			finished = false,
			--setup below
			--members below
			--participants below
			stages = {}
		}
		addon_data.next_history_index = addon_data.next_history_index + 1
		current_history_stage = nil
		extract_current_history()
		table.insert( history_stats, current_history )
	end
	cleanup_history()
end


-- Session - new lobby created
function handle_new_session_lobby()
	if debug then print( "sms_stats: new_session_lobby" ) end
	handle_common_session_lobby()
end


-- Session - returned back to lobby
function handle_returning_session_lobby()
	if debug then print( "sms_stats: returning_session_lobby" ) end
	handle_common_session_lobby()
end


-- Session - new stage has started
function handle_stage_started()
	if session_game_state == "Race" then
		if debug then print( "sms_stats: session_stage_started to " .. session_stage ) end
		session_stage_change_time = GetServerUptimeMs()
		table.add( session_counts.stage_counts, locase_session_stage, 1 )
		if current_history then
			current_history_stage = {
				start_time = GetUtcUnixTime(),
				end_time = 0,
				events = {},
				results = {},
			}
			current_history.stages[ locase_session_stage ] = current_history_stage
		end
	else
		if debug then print( "sms_stats: session_stage_started to " .. session_stage .. ", but the session state is not Race, it's " .. session_game_state ) end
	end
end


-- Session - current stage has finished
function handle_stage_finished()
	if debug then print( "sms_stats: session_stage_finished" ) end
	if session_stage_change_time then
		local now = GetServerUptimeMs()
		local duration = now - session_stage_change_time
		if duration > 0 then
			table.add( session_counts.stage_durations, locase_session_stage, duration )
		end
	end
	if current_history_stage then
		current_history_stage.end_time = GetUtcUnixTime()
		current_history_stage = nil
	end
	session_stage_change_time = nil
	session_stage = nil
	locase_session_stage = nil
	save()
end


-- Session - loading started
function handle_session_loading()
	if debug then print( "sms_stats: session_loading" ) end

	-- Update global load count
	session_counts.race_loads = session_counts.race_loads + 1

	-- Update per-track load count
	local track_id = session.attributes.TrackId
	table.add( session_counts.tracks, track_id, 1 )

	-- Update counts based on all members
	for refid,member in pairs( session.members ) do

		-- Global player load count
		session_counts.player_loads = session_counts.player_loads + 1

		-- Global vehicle load count for the member's vehicle
		local vehicle_id = member.attributes.VehicleId
		table.add( session_counts.vehicles, vehicle_id, 1 )

		-- Member's load, track and vehicle counts.
		local s = player_stats[ member.steamid ]
		if s then
			local c = s.counts
			c.race_loads = c.race_loads + 1
			table.add( c.tracks, track_id, 1 )
			table.add( c.vehicles, vehicle_id, 1 )
		end
	end

	-- Update the history
	extract_current_history()
end


-- Session - loading finished
function handle_session_loaded()
	if debug then print( "sms_stats: session_loaded" ) end
	session_counts.race_loads_done = session_counts.race_loads_done + 1
	for refid,member in pairs( session.members ) do
		session_counts.player_loads_done = session_counts.player_loads_done + 1
		local s = player_stats[ member.steamid ]
		if s then
			local c = s.counts
			c.race_loads_done = c.race_loads_done + 1
		end
	end
	if session_stage and not session_stage_change_time then
		handle_stage_started()
	end
end


-- Session - race finished too soon (no post-race or return to lobby)
function handle_session_finished_prematurely()
	if debug then print( "sms_stats: session_finished_prematurely" ) end
	if session_stage then
		handle_stage_finished()
	end
	if current_history then
		current_history.end_time = GetUtcUnixTime()
		current_history = nil
		current_history_stage = nil
	end
	save()
end


-- Session - race finished normally
function handle_session_finished()
	if debug then print( "sms_stats: session_finished" ) end
	if session_stage then
		handle_stage_finished()
	end
	session_counts.race_finishes = session_counts.race_finishes + 1
	for refid,member in pairs( session.members ) do
		session_counts.player_finishes = session_counts.player_finishes + 1
		local s = player_stats[ member.steamid ]
		if s then
			local c = s.counts
			c.race_finishes = c.race_finishes + 1
		end
	end
	if current_history then
		current_history.end_time = GetUtcUnixTime()
		current_history.finished = true
		current_history = nil
		current_history_stage = nil
	end
	save()
end


-- Session game state changes.
function handle_session_game_state_change( old_state, new_state )
	if not old_state or old_state == "" then
	  old_state = "None"
	end
	session_game_state = new_state
	if ( old_state == "None" ) and ( new_state == "Lobby" ) then
	  handle_new_session_lobby()
	elseif ( old_state == "Returning" ) and ( new_state == "Lobby" ) then
	  handle_returning_session_lobby()
	elseif ( old_state == "Lobby" ) and ( new_state == "Loading" ) then
	  handle_session_loading()
	elseif ( old_state == "Loading" ) and ( new_state == "PostRace" or new_state == "Race" ) then
	  handle_session_loaded()
	elseif ( old_state == "PostRace" or old_state == "Race" ) and ( new_state ~= "PostRace" and new_state ~= "Race" ) then
	  if new_state == "None" then
	  	handle_session_finished_prematurely()
	else
	  handle_session_finished()
	  end
	end
  end


-- Session stage changes.
function handle_session_stage_change( old_stage, new_stage )
	handle_stage_finished()
	session_stage = new_stage
	locase_session_stage = session_stage:lower()
	handle_stage_started()
end


-- Server state changes.
function handle_server_state_change( old_state, new_state )
	server_state = new_state
	if new_state == "Starting" then
		start()
	end
end


-- Session manager state changes.
function handle_session_manager_state_change( old_state, new_state )
	session_manager_state = new_state
	if ( old_state ~= "Running" ) and ( new_state == "Running" ) then
		session_counts.sessions = session_counts.sessions + 1
	end
	if ( old_state == "Running" ) and ( new_state ~= "Running" ) then
		session_game_state = "None"
		handle_session_finished_prematurely()
	end
end


-- Session attribute changes.
function handle_session_attributes( attribute_names )
	local attribute_set = table.list_to_set( attribute_names )
	if attribute_set.SessionState then
		handle_session_game_state_change( session_game_state, session.attributes.SessionState )
	end
	if attribute_set.SessionStage then
		handle_session_stage_change( session_stage, session.attributes.SessionStage )
	end
end


-- Player joins.
function handle_player_joined( player )
	local steamid = player.steamid
	if debug then print( "sms_stats: player_joined (" .. steamid .. ")" ) end

	-- Update player stats.
	if not player_stats[ steamid ] then player_stats[ steamid ] = {} end
	local s = player_stats[ steamid ]
	s.name = player.name
	s.last_joined = player.jointime

	if not s.counts then s.counts = {} end
	local c = s.counts
	if not c.race_joins then c.race_joins = 1 else c.race_joins = c.race_joins + 1 end
	if not c.race_loads then c.race_loads = 0 end
	if not c.race_loads_done then c.race_loads_done = 0 end
	if not c.race_finishes then c.race_finishes = 0 end
	if not c.tracks then c.tracks = {} end
	if not c.track_distances then c.track_distances = {} end
	if not c.vehicles then c.vehicles = {} end
	if not c.vehicle_distances then c.vehicle_distances = {} end
	if not c.qualify then c.qualify = { states = {}, positions = {}, positions_per_size = {} } end
	if not c.race then c.race = { states = {}, positions = {}, positions_per_size = {} } end

	if session_game_state == "Loading" then
		c.race_loads = c.race_loads + 1
	end
	if session_game_state == "Race" then
		c.race_loads = c.race_loads + 1
		c.race_loads_done = c.race_loads_done + 1
	end

	-- Update history.
	if current_history then
		current_history.members[ player.refid ] = extract_history_member( player )
		extract_history_member_participantids()
	end
end


-- Player leaves.
function handle_player_left( player )
	if current_history then
		local member = current_history.members[ player.refid ]
		if member then
			member.leave_time = GetUtcUnixTime()
		end
	end
end


-- Member attribute changes.
function handle_member_attributes( refid, attribute_names )
	local member = session.members[ refid ]
	if member then
		update_history_member( member )
	end
end


-- Participant created.
function handle_participant_created( participant )
	if current_history then
		current_history.participants[ participant.id ] = extract_history_participant( participant )
		extract_history_member_participantids()
	end
end


-- Participant attribute changes.
function handle_participant_attributes( participantid, attribute_names )
	local participant = session.participants[ participantid ]
	if participant then
		update_history_participant( participant )
	end
end


-- Participant lap finished.
function handle_participant_lap( participant, event )

	-- Check the participant and player
	if participant.attributes.IsPlayer == 0 then
		return
	end
	local player = session.members[ participant.attributes.RefId ]
	if not player then
		print( "sms_stats: pariticpant_lap with invalid participant's player!" )
		return
	end

	-- Update global distances for the vehicle
	local distance = event.attributes.DistanceTravelled
	local track_id = session.attributes.TrackId
	local vehicle_id = player.attributes.VehicleId
	if debug then
		print(
			string.format( "sms_stats: pariticpant_lap, pid %d, refid %d, lap %d, track %s, vehicle %s, distance %d",
			participant.id, player.refid, event.attributes.Lap, get_track_name_by_id( track_id ), get_vehicle_name_by_id( vehicle_id ), distance )
		)
	end
	table.add( session_counts.track_distances, track_id, event.attributes.DistanceTravelled )
	table.add( session_counts.vehicle_distances, vehicle_id, event.attributes.DistanceTravelled )

	-- Update player's distances for the vehicle
	local s = player_stats[ player.steamid ]
	if not s then
		print( "sms_stats: pariticpant_lap with invalid participant's player's stats!" )
		return
	end
	local c = s.counts
	table.add( c.track_distances, track_id, event.attributes.DistanceTravelled )
	table.add( c.vehicle_distances, vehicle_id, event.attributes.DistanceTravelled )
end


-- Participant stage finished.
function handle_participant_results( participant, event )

	-- Check the participant and player and stage
	if participant.attributes.IsPlayer == 0 then
		return
	end
	local player = session.members[ participant.attributes.RefId ]
	if not player then
		print( "sms_stats: participant_results with invalid participant's player!" )
		return
	end
	if not session_stage then
		print( "sms_stats: participant_results with invalid stage!" )
		return
	end
	local s = player_stats[ player.steamid ]
	if not s then
		print( "sms_stats: participant_results with invalid participant's player's stats!" )
		return
	end
	if debug then print( "sms_stats: pariticpant_results, stage " .. session_stage .. ", pid " .. participant.id .. ", refid " .. player.refid .. ", position " .. event.attributes.RacePosition ) end

	-- Grab the relevant counts for this stage (only qualify and race1 are recorded, TODO: record race2 if two-race format is ever added)
	local c = s.counts
	if session_stage == "Qualifying" then
		c = c.qualify
	elseif session_stage == "Race1" then
		c = c.race
	else
		return
	end

	-- Update the counters
	local state = event.attributes.State:lower()
	table.add( c.states, state, 1 )

	local position = event.attributes.RacePosition
	table.add( c.positions, position, 1 )

	local size = 0
	for k,v in pairs( session.members ) do
		size = size + 1
	end
	local cps = c.positions_per_size[ size ]
	if not cps then cps = {}; c.positions_per_size[ size ] = cps end
	table.add( cps, position, 1 )
end


-- Handle participant event for history
function handle_participant_history_event( participant, event )
	if not current_history_stage or not config.track_events then
		return
	end
	local e = {
		event_name = event.name,
		time = event.time,
		participantid = participant.id,
		name = participant.attributes.Name,
		refid = participant.attributes.RefId,
		is_player = ( participant.attributes.IsPlayer ~= 0 ),
		attributes = table.deep_copy( event.attributes )
	}
	table.insert( current_history_stage.events, e )
end


-- Handle participant results for history
function handle_participant_history_results( participant, event )
	if not current_history_stage or not config.track_results then
		return
	end
	local e = {
		time = event.time,
		participantid = participant.id,
		name = participant.attributes.Name,
		refid = participant.attributes.RefId,
		is_player = ( participant.attributes.IsPlayer ~= 0 ),
		attributes = table.deep_copy( event.attributes )
	}
	table.insert( current_history_stage.results, e )
end


-- Main addon callback
function addon_callback( callback, ... )

	-- Regular tick
	if callback == Callback.Tick then
		tick()
	end

	-- Server state changes.
	if callback == Callback.ServerStateChanged then
		local old_state, new_state = ...
		handle_server_state_change( old_state, new_state )
	end

	-- Session manager state changes.
	if callback == Callback.SessionManagerStateChanged then
		local old_state, new_state = ...
		handle_session_manager_state_change( old_state, new_state )
	end

	-- Session attribute changes.
	if callback == Callback.SessionAttributesChanged then
		local attribute_names = ...
		handle_session_attributes( attribute_names )
	end

	-- Member attribute changes.
	if callback == Callback.MemberAttributesChanged then
		local refid, attribute_names = ...
		handle_member_attributes( refid, attribute_names )
	end

	-- Participant attribute changes.
	if callback == Callback.ParticipantAttributesChanged then
		local id, attribute_names = ...
		handle_participant_attributes( id, attribute_names )
	end

	-- Handle events.
	if callback == Callback.EventLogged then
		local event = ...
		if event.type == "Player" then
			local refid = event.refid
			local player = session.members[ refid ]
			if event.name == "PlayerJoined" and player then
				handle_player_joined( player )
			elseif event.name == "PlayerLeft" and player then
				handle_player_left( player )
			end
		elseif event.type == "Participant" then
			local pid = event.participantid
			local participant = session.participants[ pid ]
			if event.name == "ParticipantCreated" and participant then
				handle_participant_created( participant )
			elseif event.name == "Lap" and participant then
				handle_participant_lap( participant, event )
				handle_participant_history_event( participant, event )
			elseif event.name == "Results" and participant then
				handle_participant_results( participant, event )
				handle_participant_history_results( participant, event )
			elseif ( event.name == "State" or event.name == "Impact" or event.name == "CutTrackStart" or event.name == "CutTrackEnd" ) and participant then
				handle_participant_history_event( participant, event )
			end
		end
	end
end


-- Main
RegisterCallback( addon_callback )
EnableCallback( Callback.Tick )
EnableCallback( Callback.ServerStateChanged )
EnableCallback( Callback.SessionManagerStateChanged )
EnableCallback( Callback.SessionAttributesChanged )
EnableCallback( Callback.MemberAttributesChanged )
EnableCallback( Callback.ParticipantAttributesChanged )
EnableCallback( Callback.EventLogged )


-- EOF --
