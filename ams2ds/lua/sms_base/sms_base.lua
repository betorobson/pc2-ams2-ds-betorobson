-- The server defines various lists: tracks, vehicles, vehicle_classes, as well as several enums and flags lists
-- These lists are ordered arrays of structures. For easier access we process the lists at startup and build the
-- following structures from them.

-- Maps from either IDs or names to vehicles/vehicle classes/tracks.
-- The values are the vehicle/class/track structures.
-- So for example id_to_track[ 1300627020 ] and name_to_track[ "Brands Hatch Indy" ] both reference the same structure with info about the Brands Hatch Indy track.
id_to_vehicle = {}
name_to_vehicle = {}
id_to_vehicle_class = {}
name_to_vehicle_class = {}
id_to_track = {}
name_to_track = {}

-- Attributes.
-- Maps from attribute names to attribute descriptors.
name_to_session_attribute = {}
name_to_member_attribute = {}
name_to_participant_attribute = {}

-- Callbacks.
-- Map from callback type names to values used when enabling/disabling the callbacks.
-- So for example you would call "EnableCallback( Callback.Tick )" to enable the "Tick" callback.
Callback = {}
value_to_callback = {}

-- Enums extracted from builtin lists.
-- Maps from enum names to values, so for example Damage.OFF is 0, AllowedView.CockpitHelmet is 2.
Damage = {}
TireWear = {}
FuelUsage = {}
Penalties = {}
GameMode = {}
AllowedView = {}
Weather = {}
GridPositions = {}
PitControl = {}
OnlineRep = {}

-- Inverse enum maps from values to names.
value_to_damage = {}
value_to_tire_wear = {}
value_to_fuel_usage = {}
value_to_penalties = {}
value_to_game_mode = {}
value_to_allowed_view = {}
value_to_weather = {}
value_to_grid_positions = {}
value_to_pit_control = {}
value_to_online_rep = {}

-- Flags extracted from builtin lists.
-- Maps from flag names to values, so for example SessionFlags.FORCE_IDENTICAL_VEHICLES is 2.
SessionFlags = {}
PlayerFlags = {}

-- Inverse flags maps from values to names.
value_to_session_flag = {}
value_to_player_flag = {}


-- Helper function: Get track name. Automatically returns "<unknown track %d>" if passed track id is not a valid tack id.
function get_track_name_by_id( track_id )
	local track = id_to_track[ track_id ]
	if track then return track.name end
	return string.format( "<unknown track %d>", track_id )
end


-- Helper function: Get vehicle name. Automatically returns "<unknown vehicle %d>" if passed vehicle id is not a valid vehicle id.
function get_vehicle_name_by_id( vehicle_id )
	local vehicle = id_to_vehicle[ vehicle_id ]
	if vehicle then return vehicle.name end
	return string.format( "<unknown vehicle %d>", vehicle_id )
end


-- Helper function: Simple table dumper
-- Call dump( table ) to print the table contents to output. Useful for debugging scripts.
function dump( table, indent )
	indent = indent or ""
	for k,v in pairs( table ) do
		if type( v ) == "table" then
			print( indent .. k .. ":" );
			dump( v, indent .. "  " )
		else
			print( indent .. k .. ": " .. tostring( v ) )
		end
	end
end


-- Helper function: Similar to dump, but also prints key and scalar value types.
function dump_typed( table, indent )
	indent = indent or ""
	for k,v in pairs( table ) do
		if type( v ) == "table" then
			print( indent .. type( k ) .. " " .. k .. ":" );
			dump_typed( v, indent .. "  " )
		else
			print( indent .. type( k ) .. " " .. k .. ": " .. type( v ) .. " " .. tostring( v ) )
		end
	end
end


-- Helper function: Extend the "string" package with split method that returns array of string splits on given pattern.
function string:split( pattern, results )
	if not results then results = {} end
	local offset = 1
	local split_start, split_end = string.find( self, pattern, offset )
	while split_start do
		table.insert( results, string.sub( self, offset, split_start - 1 ) )
		offset = split_end + 1
		split_start, split_end = string.find( self, pattern, offset )
	end
	table.insert( results, string.sub( self, offset ) )
	return results
end


-- Helper function: Extend the "table" package with shallow copy function. This also does not copy the meta-table.
function table.shallow_copy( other_table )
	if type( other_table ) ~= "table" then return other_table end
	local new_table = {}
	for k,v in pairs( other_table ) do
		new_table[ k ] = v
	end
	return new_table
end


-- Helper function: Extend the "table" package with deep copy function. This also copies the meta-table.
function table.deep_copy( other_table, seen )
	if type( other_table ) ~= "table" then return other_table end
	if seen and seen[ other_table ] then return seen[ other_table ] end
	local s = seen or {}
	local new_table = setmetatable( {}, getmetatable( other_table ) )
	s[ other_table ] = new_table
	for k,v in pairs( other_table ) do
		new_table[ table.deep_copy( k, s ) ] = table.deep_copy( v, s )
	end
	return new_table
end


-- Helper function: Deep copy function that also converts keys in subtables matching given names from strings to integers.
function table.deep_copy_normalized( other_table, intkey_table_names, this_table_name, seen )
	if type( other_table ) ~= "table" then return other_table end
	if seen and seen[ other_table ] then return seen[ other_table ] end
	local s = seen or {}
	local new_table = setmetatable( {}, getmetatable( other_table ) )
	s[ other_table ] = new_table
	local itn = intkey_table_names or {}
	local ttn = this_table_name or ""
	if itn[ ttn ] then
		for k,v in pairs( other_table ) do
			local kcopy = tonumber( table.deep_copy_normalized( k, itn, nil, s ) )
			new_table[ kcopy ] = table.deep_copy_normalized( v, itn, nil, s )
		end
	else
		for k,v in pairs( other_table ) do
			local kcopy = table.deep_copy_normalized( k, itn, nil, s )
			new_table[ kcopy ] = table.deep_copy_normalized( v, itn, kcopy, s )
		end
	end
	return new_table
end


-- Helper function: Extend the "table" package with list to set conversion. List is a simple array of scalars, the set is map from those scalars to "true".
function table.list_to_set( list )
	local set = {}
	for _,v in ipairs( list ) do
		set[ v ] = true
	end
	return set
end


-- Add value to a table element, or create new element with the value.
function table.add( table, key, delta )
	if table[ key ] then
		table[ key ] = table[ key ] + delta
	else
		table[ key ] = delta
	end
end


-- Equivalent to table.add with negated delta
function table.subtract( table, key, delta )
	if table[ key ] then
		table[ key ] = table[ key ] - delta
	else
		table[ key ] = -delta
	end
end


local attribute_to_enum = {
	DamageType = { Damage, value_to_damage },
	TireWearType = { TireWear, value_to_tire_wear },
	FuelUsageType = { FuelUsage, value_to_fuel_usage },
	PenaltiesType = { Penalties, value_to_penalties },
	AllowedViews = { AllowedView, value_to_allowed_view },
	PracticeWeatherSlot1 = { Weather, value_to_weather },
	PracticeWeatherSlot2 = { Weather, value_to_weather },
	PracticeWeatherSlot3 = { Weather, value_to_weather },
	PracticeWeatherSlot4 = { Weather, value_to_weather },
	QualifyWeatherSlot1 = { Weather, value_to_weather },
	QualifyWeatherSlot2 = { Weather, value_to_weather },
	QualifyWeatherSlot3 = { Weather, value_to_weather },
	QualifyWeatherSlot4 = { Weather, value_to_weather },
	RaceWeatherSlot1 = { Weather, value_to_weather },
	RaceWeatherSlot2 = { Weather, value_to_weather },
	RaceWeatherSlot3 = { Weather, value_to_weather },
	RaceWeatherSlot4 = { Weather, value_to_weather },
	GridLayout = { GridPositions, value_to_grid_positions },
	ManualPitStops = { PitControl, value_to_pit_control },
	MinimumOnlineRank = { OnlineRep, value_to_online_rep },
}

local attribute_to_flags = {
	Flags = { SessionFlags, value_to_session_flag },
}


-- Helper function: Remap track name to id if possible.
function normalize_track( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		return value
	end
	if ( t == "string" ) then
		local track = name_to_track[ value ]
		if track then
			return track.id
		end
		error( "Unknown track name '" .. value .. "' passed to normalize_track" )
	end
	error( "Value of unexpected type '" .. t .. "' passed to normalize_track" )
end


-- Helper function: Remap vehicle name to id if possible.
function normalize_vehicle( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		return value
	end
	if ( t == "string" ) then
		local vehicle = name_to_vehicle[ value ]
		if vehicle then
			return vehicle.id
		end
		error( "Unknown vehicle name '" .. value .. "' passed to normalize_vehicle" )
	end
	error( "Value of unexpected type '" .. t .. "' passed to normalize_vehicle" )
end


-- Helper function: Remap vehicle class name to id if possible.
function normalize_vehicle_class( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		return value
	end
	if ( t == "string" ) then
		local vehicle_class = name_to_vehicle_class[ value ]
		if vehicle_class then
			return vehicle_class.id
		end
		error( "Unknown vehicle class '" .. value .. "' passed to normalize_vehicle_class" )
	end
	error( "Value of unexpected type '" .. t .. "' passed to normalize_vehicle_class" )
end


-- Helper function: Remap enum value from string to number if possible. The value can be either an integral value, or the enum name.
function normalize_session_enum( enum, value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		return value
	end
	if ( t == "string" ) then
		local v = enum[ value ]
		if v then
			return v
		end
		error( "Unknown value '" .. value .. "' passed to normalize_session_enum" )
	end
	error( "Value of unexpected type '" .. t .. "' passed to normalize_session_enum" )
end


-- Helper function: Remap flag value from string to number if possible. The value can be either an integral value, the flag name, or comma-separated list of integral values and flag names.
function normalize_session_flags( flags, value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		return value
	end
	if ( t == "string" ) then
		local f = 0
		for _,flag in ipairs( value:split( "," ) ) do
			local n = tonumber( flag, 10 )
			if n then
				f = f | n
			else
				local v = flags[ flag ]
				if v then
					f = f | v
				else
					error( "Unknown flag value '" .. flag .. "' passed to normalize_session_flags" )
				end
			end
		end
		return f
	end
	error( "Value of unexpected type '" .. t .. "' passed to normalize_session_flags" )
end


-- Help function: Normalize session key-value attribute pair. Returns the value, after applying normalization if the key is enum or flags.
function normalize_session_attribute( key, value )
	if key == "TrackId" then
		return normalize_track( value )
	elseif key == "VehicleModelId" then
		return normalize_vehicle( value )
	elseif key == "VehicleClassId" then
		return normalize_vehicle_class( value )
	end

	local enum = attribute_to_enum[ key ]
	if enum then
		return normalize_session_enum( enum[ 1 ], value )
	end

	local flags = attribute_to_flags[ key ]
	if flags then
		return normalize_session_flags( flags[ 1 ], value )
	end

	return value
end


-- Helper function: Go over table with attribute-value pairs, and fixup all enum/flag values from strings to integers
function normalize_session_attributes( attributes )
	for k,v in pairs( attributes ) do
		attributes[ k ] = normalize_session_attribute( k, v )
	end
	return attributes
end


-- Redefine builtins SetSessionAttributes, SetNextSessionAttributes, SetSessionAndNextAttributes
-- to always automatically normalize enum/flags arguments.
local builtinSetSessionAttributes = SetSessionAttributes
local builtinSetNextSessionAttributes = SetNextSessionAttributes
local builtinSetSessionAndNextAttributes = SetSessionAndNextAttributes

function SetSessionAttributes( attributes )
	return builtinSetSessionAttributes( normalize_session_attributes( attributes ) )
end

function SetNextSessionAttributes( attributes )
	return builtinSetNextSessionAttributes( normalize_session_attributes( attributes ) )
end

function SetSessionAndNextAttributes( attributes )
	return builtinSetSessionAndNextAttributes( normalize_session_attributes( attributes ) )
end


-- Helper function: Reverse of normalize_track, convert integral value to track name, if possible
function stringify_track( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		local track = id_to_track[ value ]
		if track then
			return track.name
		else
			return value
		end
	end
	if ( t == "string" ) then
		return value
	end
	error( "Value of unexpected type '" .. t .. "' passed to stringify_track" )
end


-- Helper function: Reverse of normalize_vehicle, convert integral value to vehicle name, if possible
function stringify_vehicle( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		local vehicle = id_to_vehicle[ value ]
		if vehicle then
			return vehicle.name
		else
			return value
		end
	end
	if ( t == "string" ) then
		return value
	end
	error( "Value of unexpected type '" .. t .. "' passed to stringify_vehicle" )
end


-- Helper function: Reverse of normalize_vehicle_class, convert integral value to vehicle class name, if possible
function stringify_vehicle_class( value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		local vehicle_class = id_to_vehicle_class[ value ]
		if vehicle_class then
			return vehicle_class.name
		else
			return value
		end
	end
	if ( t == "string" ) then
		return value
	end
	error( "Value of unexpected type '" .. t .. "' passed to stringify_vehicle_class" )
end


-- Helper function: Reverse of normalize_session_enum, convert integral value to enum name, if possible
function stringify_session_enum( enum, value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		local s = enum[ value ]
		if s then
			return s
		else
			return value
		end
	end
	if ( t == "string" ) then
		return value
	end
	error( "Value of unexpected type '" .. t .. "' passed to stringify_session_enum" )
end


-- Helper function: Reverse of normalize_session_flags, convert integral value to comma-separated stringified flags, if possible
function stringify_session_flags( flags, value )
	local t = type( value )
	if ( t == "number" ) or ( t == "integer" ) then
		local s = ""
		for flag,name in pairs( flags ) do
			if ( value & flag ) == flag then
				value = value & ~flag
				if s ~= "" then s = s .. "," end
				s = s .. name
			end
		end
		if value ~= 0 then
			if s ~= "" then s = s .. "," end
			s = s .. tostring( value )
		end
		return s
	end
	if ( t == "string" ) then
		return value
	end
	error( "Value of unexpected type '" .. t .. "' passed to stringify_session_enum" )
end


-- Helper function: Reverse of normalize_session_attribute, convert values to strings if the key is enum or flags
function stringify_session_attribute( key, value )
	if key == "TrackId" then
		return stringify_track( value )
	elseif key == "VehicleModelId" then
		return stringify_vehicle( value )
	elseif key == "VehicleClassId" then
		return stringify_vehicle_class( value )
	end

	local enum = attribute_to_enum[ key ]
	if enum then
		return stringify_session_enum( enum[ 2 ], value )
	end

	local flags = attribute_to_flags[ key ]
	if flags then
		return stringify_session_flags( flags[ 2 ], value )
	end

	return value
end


-- Helper function: Reverse of normalize_session_attributes, convert values of known enums/flags to strings where possible
function stringify_session_attributes( attributes )
	for k,v in pairs( attributes ) do
		attributes[ k ] = stringify_session_attribute( k, v )
	end
	return attributes
end


---------------------------------------------------------------------------------------------------------
-- Private stuff begins, nothing to see down here if you care only about the public BASE functionality --
---------------------------------------------------------------------------------------------------------

-- Create map from a list referencing specific list values.
-- For example to create map of flag names to flag values.
local function extract_list_values( target_map, source_list, key_name, value_name )
	for _,v in ipairs( source_list ) do
		target_map[ v[ key_name ] ] = v[ value_name ]
	end
end

-- Create map from a list referencing the list elements.
-- For example to create map of vehicle ids to vehicles.
local function extract_list_references( target_map, source_list, key_name )
	for _,v in ipairs( source_list ) do
		target_map[ v[ key_name ] ] = v
	end
end

-- Create various useful maps from the built-in lists.
local function extract_lists()
	extract_list_references( id_to_vehicle, lists.vehicles.list, "id" )
	extract_list_references( name_to_vehicle, lists.vehicles.list, "name" )
	extract_list_references( id_to_vehicle_class, lists.vehicle_classes.list, "id" )
	extract_list_references( name_to_vehicle_class, lists.vehicle_classes.list, "name" )
	extract_list_references( id_to_track, lists.tracks.list, "id" )
	extract_list_references( name_to_track, lists.tracks.list, "name" )

	extract_list_references( name_to_session_attribute, lists.attributes.session.list, "name" )
	extract_list_references( name_to_member_attribute, lists.attributes.member.list, "name" )
	extract_list_references( name_to_participant_attribute, lists.attributes.participant.list, "name" )

	extract_list_values( Callback, lists.callbacks.list, "name", "value" )
	extract_list_values( value_to_callback, lists.callbacks.list, "value", "name" )

	extract_list_values( Damage, lists.enums.damage.list, "name", "value" )
	extract_list_values( TireWear, lists.enums.tire_wear.list, "name", "value" )
	extract_list_values( FuelUsage, lists.enums.fuel_usage.list, "name", "value" )
	extract_list_values( Penalties, lists.enums.penalties.list, "name", "value" )
	extract_list_values( GameMode, lists.enums.game_mode.list, "name", "value" )
	extract_list_values( AllowedView, lists.enums.allowed_view.list, "name", "value" )
	extract_list_values( Weather, lists.enums.weather.list, "name", "value" )
	extract_list_values( GridPositions, lists.enums.grid_positions.list, "name", "value" )
	extract_list_values( PitControl, lists.enums.pit_control.list, "name", "value" )
	extract_list_values( OnlineRep, lists.enums.online_rep.list, "name", "value" )

	extract_list_values( value_to_damage, lists.enums.damage, "value", "name" )
	extract_list_values( value_to_tire_wear, lists.enums.tire_wear.list, "value", "name" )
	extract_list_values( value_to_fuel_usage, lists.enums.fuel_usage.list, "value", "name" )
	extract_list_values( value_to_penalties, lists.enums.penalties.list, "value", "name" )
	extract_list_values( value_to_game_mode, lists.enums.game_mode.list, "value", "name" )
	extract_list_values( value_to_allowed_view, lists.enums.allowed_view.list, "value", "name" )
	extract_list_values( value_to_weather, lists.enums.weather.list, "value", "name" )
	extract_list_values( value_to_grid_positions, lists.enums.grid_positions.list, "value", "name" )
	extract_list_values( value_to_pit_control, lists.enums.pit_control.list, "value", "name" )
	extract_list_values( value_to_online_rep, lists.enums.online_rep.list, "value", "name" )

	extract_list_values( SessionFlags, lists.flags.session.list, "name", "value" )
	extract_list_values( PlayerFlags, lists.flags.player.list, "name", "value" )

	extract_list_values( value_to_session_flag, lists.flags.session.list, "value", "name" )
	extract_list_values( value_to_player_flag, lists.flags.player.list, "value", "name" )
end

extract_lists()

-- Temporary hacky tests

--[[
print( "SPLIT TESTS:" )
dump( ( "foo,bar,baz" ):split( "," ) )
dump( ( "foobar" ):split( "o" ) )
dump( ( "foo,bar,baz" ):split( "," ) )
dump( ( "foobar" ):split( "o" ) )
--]]


--[[
dump( SessionFlags )
dump( Weather )
print( "" )
print( "CLEAN TESTS:" )
local attrs = { TrackId = 1234, Flags = "AI_ALLOWED,FORCE_IDENTICAL_VEHICLES", WeatherSlot1 = "Weather_Clear1", ServerControlsVehicleClass = 1, ServerControlsVehicle = 0, Practice1Length = 5 }
dump( attrs )
print( "" )
print( "AFTER:" )
normalize_session_attributes( attrs )
dump( attrs )
print( "" )
print( "AND BACK:" )
stringify_session_attributes( attrs )
dump( attrs )
--]]

-- EOF --
