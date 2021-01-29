//// betorobson version

var sessionConfigBetoRobson = {

    init: function(){

        var submitSessionWrapper = $('#mainContainer');

        submitSessionWrapper.append('<input text="" id="favoriteSession" placeholder="Favorite" size="40" maxlength="40" />')
        submitSessionWrapper.append('<ul style="padding-top: 20px;" id="favorites"></ul>');
        submitSessionWrapper.append('<form onsubmit="return sessionConfigBetoRobson.saveFavoriteList()">Favorite list debug<input type="text" id="favoriteListDebug" /></form>');

        sessionConfigBetoRobson.setFavoriteListDebug();

        sessionConfigBetoRobson.showFavorites();

        sessionConfigBetoRobson.showChatMessage();

    },

    getStorage: function(){

        var storage = localStorage.getItem('favorite');

        if(storage){
            storage = JSON.parse(storage);
        }else{
            storage = {};
        }

        return storage;

    },

    chat: function(){

        var message = $('#chatMessage').val();

        $('#chatMessage').val('');

        $.get('/api/session/send_chat?message=!!!!!!!!')
            .then(() => $.get('/api/session/send_chat?message=' + encodeURIComponent(message)));

        return false;
    },

    showChatMessage: function(){

        var menu = $('#mainContainer');

        menu.prepend(`
            <form onsubmit="return sessionConfigBetoRobson.chat()">
                <input type="text" placeholder="chat" style="width:100%;margin-top: 8px;" id="chatMessage" />
            </form>
        `);

    },

    showFavorites: function(){

        var wrapper = $('#favorites');

        wrapper.html('');

        var storage = sessionConfigBetoRobson.getStorage();

        Object.entries(storage).map(([entry, data]) => {
            wrapper.append(`<li><button onclick="sessionConfigBetoRobson.removeFavorite('${entry}', this)" type="button" class="btn btn-link glyphicon glyphicon-remove"></button><button onclick="sessionConfigBetoRobson.setFavoriteSession('${entry}')" style="margin-bottom: 8px;" class="btn btn-default">${entry}</button></li>`);
        });

    },

    setFavoriteSession: function(name){

        var session = $('.tab-pane.active').attr('id').replace(/Session/,'');

        var storage = sessionConfigBetoRobson.getStorage();

        $('#favoriteSession').val('');

        sessionConfig.saveAttributes(session, storage[name]);
    },

    saveFavorite: function(data){

        var storage = sessionConfigBetoRobson.getStorage();

        var name = $('#favoriteSession').val();

        if(name){
            console.log(name, ': ', data);
            storage[name] = data;
            localStorage.setItem('favorite', JSON.stringify(storage));
        }

    },

    removeFavorite: function(name, elem){

        var storage = sessionConfigBetoRobson.getStorage();

        var r = confirm("Delete " + name + "?");

        if (r == true) {

            delete storage[name];

            localStorage.setItem('favorite', JSON.stringify(storage));

            $(elem).parent().remove();

            sessionConfigBetoRobson.setFavoriteListDebug();

        }


    },

    saveFavoriteList: function(){

        var favoriteDebug = $('#favoriteListDebug').val();

        try{
            favoriteDebug = JSON.parse(favoriteDebug);
        }catch(e){
            favoriteDebug = sessionConfigBetoRobson.getStorage();
        };

        localStorage.setItem('favorite', JSON.stringify(favoriteDebug));

        sessionConfigBetoRobson.showFavorites();

        return false;
    },

    setFavoriteListDebug: function(){
        $('#favoriteListDebug').val(localStorage.getItem('favorite'));
    }

}

$(document).ready(sessionConfigBetoRobson.init);

    /*
    * Main submit method.
    * TODO implement validators
    * It takes "next" or "current" as the argument.
    */
    sessionConfig.saveAttributes = function (sessionToModify, data) {

        /*
        $("#attributesForm").validate({
            rules: {
                GridSize: { required: true, notEmpty: true, digits: true },
                MaxPlayers: { required: true, notEmpty: true, digits: true },
                OpponentDifficulty: { required: true, notEmpty: true, percentage: true },
                startingRaceDate: { required: true, notEmpty: true, dateRequiredWithFormat: true },
                Practice1Length: { required: true, notEmpty: true, digits: true },
                Qualify1Length: { required: true, notEmpty: true, digits: true },
                Race1Length: { required: true, notEmpty: true, digits: true },
            },
        });
        */

        ampersand = "&";
        apiUrl = "/api/session/";
        applyToNext = $("#applyToNext").prop( "checked" );
        if (sessionToModify == "current") {
            apiUrl = apiUrl + "set_attributes?copy_to_next=" + applyToNext + ampersand;
        }
        else if (sessionToModify == "next") {
            apiUrl = apiUrl + "set_next_attributes?";
        }
        else {
            alert("Invalid gameSession");
            return;
        }

        if(!data){

        // Global Flags variable is set to 0 in each "submit" request.
        flags = 0;
        // Getting all the yes/no radio buttons with the "flag" class name.
        // Flags is added to the URL later on, as there are other values to be added
        $("#" + sessionToModify + "Session input.flag:checked").each(function (index) {
            flagValue = parseInt($(this).val());
            if( flagValue != 0 ) {
                flags = flags + flagValue;
            }
        });

        vehicleModelId = $("#" + sessionToModify + "Vehicle").val();
        apiUrl = apiUrl + "session_VehicleModelId=" + vehicleModelId + ampersand;

        trackId = $("#" + sessionToModify + "Track").val();
        apiUrl = apiUrl + "session_TrackId=" + trackId + ampersand;

        apiUrl = apiUrl + sessionConfig.commonPanelAttributes(sessionToModify, "Race", ampersand);

        raceLengthType = $("input[name=" + sessionToModify + "LengthType]:checked").val();
        flags = flags + parseInt(raceLengthType);

        formationLap = $("#" + sessionToModify + "RaceFormationLap").val();
        apiUrl = apiUrl + "session_RaceFormationLap=" + formationLap + ampersand;

        mandatoryPitStops = $("#" + sessionToModify + "RaceMandatoryPitStops").val();
        apiUrl = apiUrl + "session_RaceMandatoryPitStops=" + mandatoryPitStops + ampersand;

        raceRollingStart = $("#" + sessionToModify + "RaceRollingStart").val();
        apiUrl = apiUrl + "session_RaceRollingStart=" + raceRollingStart + ampersand;

        apiUrl = apiUrl + sessionConfig.commonPanelAttributes(sessionToModify, "Practice", ampersand);
        apiUrl = apiUrl + sessionConfig.commonPanelAttributes(sessionToModify, "Qualifying", ampersand);

        allowedViews = $("input[name=" + sessionToModify + "ForceInteriorView]:checked").val();
        apiUrl = apiUrl + "session_AllowedViews=" + allowedViews + ampersand;

        damageType = $("#" + sessionToModify + "DamageType").val();
        apiUrl = apiUrl + "session_DamageType=" + damageType + ampersand;

        fuelUsage = $("input[name=" + sessionToModify + "FuelUsage]:checked").val();
        apiUrl = apiUrl + "session_FuelUsageType=" + fuelUsage + ampersand;

        tyreWear = $("#" + sessionToModify + "TyreWear").val();
        apiUrl = apiUrl + "session_TireWearType=" + tyreWear + ampersand;

        manualPitControl = $("input[name=" + sessionToModify + "ManualPitControl]:checked").val();
        apiUrl = apiUrl + "session_ManualPitStops=" + manualPitControl + ampersand;

        aiSkill = $("#" + sessionToModify + "AiSkill").val().replace("%", "");
        apiUrl = apiUrl + "session_OpponentDifficulty=" + aiSkill + ampersand;

        opponentField = $( "#" + sessionToModify + "OpponentField").val() ;
        if (parseInt( opponentField ) > 0)
        {
            flags = flags + parseInt( opponentField );
        }

        if (opponentField == "2") { // "identical"
            vehicleModelId = $("#" + sessionToModify + "Vehicle").val();
            if( sessionConfig.serverControlsVehicle( sessionToModify ) )
            {
                // if serverControlsVehicle is set (current) or checked (next), send the vehicleModelId
                apiUrl = apiUrl + "session_VehicleModelId=" + vehicleModelId + ampersand;
            }

        } else if (opponentField == "512") { // "sameClass"
            vehicleClassId = $("#" + sessionToModify + "VehicleClass").val();
            if ( sessionConfig.serverControlsClass( sessionToModify ) )
            {
                // if serverControlsClass is set (current) or checked (next), send the vehicleClassId
                apiUrl = apiUrl + "session_VehicleClassId=" + vehicleClassId + ampersand;
            }

        } else if (opponentField == "1024") { // "multiClass"
            vehicleClassId = $("#" + sessionToModify + "VehicleClass").val();
            if (sessionConfig.serverControlsClass(sessionToModify))
            {
                // if serverControlsClass is set (current) or checked (next), send the vehicleClassId
                apiUrl = apiUrl + "session_VehicleClassId=" + vehicleClassId + ampersand;
            }

            var multiClassSlots = [];
            var classIndex = 0;
            $("input[name=" + sessionToModify + "VehicleClassCheckbox]").map(function () {
                if( $(this).prop( 'checked' ) == true && $(this).prop( 'disabled' ) == false ) {
                    multiClassSlots[classIndex] = $(this).val();
                    classIndex++;
                }
            });
            if (multiClassSlots.length > 3)
            {
                // 3 multiclasses + the one from the selected vehicle, which is preselected, but not in the array
                alert("Please select up to 4 vehicle classes");
                return;
            }
            apiUrl = apiUrl + "session_MultiClassSlots=" + multiClassSlots.length + ampersand;
            $.each(multiClassSlots, function (index, value) {
                apiUrl = apiUrl + "session_MultiClassSlot" + (index+1) + "=" + value + ampersand;
            });
        }

        minOnlineRank = $("#" + sessionToModify + "MinimumOnlineRank").val();
        apiUrl = apiUrl + "session_MinimumOnlineRank=" + minOnlineRank + ampersand;
        minOnlineStrength = $("#" + sessionToModify + "MinPlayerStrength").val();
        apiUrl = apiUrl + "session_MinimumOnlineStrength=" + minOnlineStrength + ampersand;

        // RaceFlags = PenaltiesType
        raceFlags = $("input[name=" + sessionToModify + "Flags]:checked").val();
        apiUrl = apiUrl + "session_PenaltiesType=" + raceFlags + ampersand;

        trackCuttingPenalty = $("input[name=" + sessionToModify + "TrackCuttingPenalty]").val();
        // TODO slider for allowableTimePenalty value: 0 to disable, valid range supported by game is 5 to 30
        allowableTimePenaltyEl = $("#" + sessionToModify + "AllowableTimePenalty");
        // for any reason, "attr" doesn't work here. "prop" is used instead. It has to do with jQuery version.
        if (parseInt(trackCuttingPenalty) == 0 || $(allowableTimePenaltyEl).prop("disabled") == true) {
            allowableTimePenalty = 0;
        } else {
            allowableTimePenalty = allowableTimePenaltyEl.val();
        }
        apiUrl = apiUrl + "session_AllowablePenaltyTime=" + allowableTimePenalty + ampersand;

        driveThroughPitPenalties = $("input[name=" + sessionToModify + "DriveThroughPitPenalties]:checked").val();
        apiUrl = apiUrl + "session_DriveThroughPenalty=" + driveThroughPitPenalties + ampersand;

        pitLaneWhiteLinePenalty = $("input[name=" + sessionToModify + "PitLaneWhiteLinePenalty]:checked").val();
        apiUrl = apiUrl + "session_PitWhiteLinePenalty=" + pitLaneWhiteLinePenalty + ampersand;

        if (sessionToModify == "next" || applyToNext )
        {
            serverControlsClass = $("#changeClass").prop("checked") == true ? "0" : "1";
            apiUrl = apiUrl + "session_ServerControlsVehicleClass=" + serverControlsClass + ampersand;

            serverControlsTrack = $("#changeTrack").prop("checked") == true ? "0" : "1";
            apiUrl = apiUrl + "session_ServerControlsTrack=" + serverControlsTrack + ampersand;

            serverControlsVehicle = $("#changeVehicle").prop("checked") == true ? "0" : "1";
            apiUrl = apiUrl + "session_ServerControlsVehicle=" + serverControlsVehicle + ampersand;

            // TODO JS validation: Total maximum grid size, including AI participants. Can never be larger than the maximum session size set in the server
            gridSize = $("#" + sessionToModify + "MaxGridSize").val();
            apiUrl = apiUrl + "session_GridSize=" + gridSize + ampersand;

            // TODO JS validation: Maximum number of players. Can't be higher than GridSize, but can be lower and then the extra slots will be reserved for AI vehicles.
            maxPlayers = $("#" + sessionToModify + "MaxHumanOpponents").val();
            apiUrl = apiUrl + "session_MaxPlayers=" + maxPlayers + ampersand;

            gridLayout = $("#" + sessionToModify + "GridLayout").val();
            // TODO: 5 means CUSTOM -- have this dynamically? or check the name instead
            if (gridLayout == 5) {
                gridPosition = $("#" + sessionToModify + "GridPosition").val();
                // TODO validate gridPosition is a number
                // 10 is the eGridPosition_Num value that defines that > that value = custom grid position - that value. I.e. 13 means 3rd position.
                gridLayout = parseInt( gridPosition ) + 10;
            }
            apiUrl = apiUrl + "session_GridLayout=" + gridLayout + ampersand;
        }

        apiUrl = apiUrl + "session_Flags=" + flags + ampersand;

        sessionConfigBetoRobson.saveFavorite(apiUrl.replace(/.+\?(.*?)/, '$1'));

        }else{

            apiUrl = apiUrl + data;

        }

        serverStateRunningActive = $("#serverStateRunningActive").val() == "true";
        currentAndInactive = sessionToModify == "current" && !serverStateRunningActive;
        if ( currentAndInactive && applyToNext )
        {
            alert( "Values will be saved for NEXT session (current session state does not allow attribute changes for current session)" );
        }
        else if (currentAndInactive && !applyToNext) {
            alert("Current session state does not allow attribute changes for current session.");
            return;
        }

        $('.loaderImage').show();
        $.get(apiUrl, function (data) {
            result = data.result;
            var redirectUrl = "sessionConfig?result=" + result +"&mainTab=" + sessionToModify;
            window.location.href = redirectUrl;
            console.log( result );
            // We don't hide the loader image here, as the page is to be reloaded anyway
        }).fail(function () {
            console.log("ERROR: API request returned something else than 200");
            $.notify("HTTP request to server API failed -- Server attributes could not be modified");
            $('.loaderImage').hide();
        });
    };
