var flags = 0;
var sessionConfig = {

    init: function () {

        sessionConfig.config = {
            gameSessions: ["current", "next"],
            sessionNames: ["Race", "Practice", "Qualifying"],
            result: webtool.getParameterByName("result"),
        };

        sessionConfig.setup();

        if (sessionConfig.config.result == "ok") {
            $.notify("Attribute changes submitted to server", "success");
        }
    },

    setup: function () {
        //sessionConfig.setupDatePickers();
        sessionConfig.handlePanelsStatusChanged();
        sessionConfig.setupYesNoButtons();
        sessionConfig.setupAiSkillSlider();
        sessionConfig.setupMinPlayerStrengthSlider();
        sessionConfig.addOnChangeToVehicleSelect();
        //sessionConfig.setupRealWeatherToggles();
        //sessionConfig.addOnChangeToWeatherSlots();
        sessionConfig.addOnChangeToGridLayout();
        sessionConfig.addOnChangeToMaxGridSize();
        sessionConfig.addOnChangeToMaxHumanOpponents();
        sessionConfig.addOnChangeToRulesAndPenalties();
        sessionConfig.addOnChangeToTrackCuttingPenalty();
        sessionConfig.addOnChangeToCompetitiveRacingLicense();
        sessionConfig.addOnChangeToOpponentField();
        sessionConfig.addOnChangeToStartType();
        sessionConfig.setupOpponentFieldCurrent();
        sessionConfig.addOnChangeToMultiClassCheckboxes();
        sessionConfig.addOnChangeToLengthType();
        sessionConfig.addOnChangeToApplyToNext();
        sessionConfig.addOnChangeToTrackSelect("next");
        sessionConfig.setupAllowableTimePenaltySlider();
        sessionConfig.toggleTabEdit("Current");
        sessionConfig.toggleTabEdit("Next");
    },

    
    setupOpponentFieldCurrent: function()
    {
         // ServerControlsVehicleClass validations for CURRENT
        //
        // If ServerControlsVehicleClass is FALSE, OpponentField must be set to ANY, otherwise, wrong behaviours are experienced on the clients:
        //    - IDENTICAL takes the car sent by server, even though ServerControlsVehicle / ServerControlsVehicleClass are false, and host/clients can't change the vehicle. 
        //    - MULTI_CLASS, it takes the three selected classes, ignoring the one belonging to the selected vehicle id (in web tool). Instead, it takes default vehicle's class (Road A)
        //    - SAME_CLASS uses default vehicle's class (Road A)
        ;
        if ( !sessionConfig.serverControlsClass( "current" ) )
        {
            $("#currentOpponentField").val("0"); // Any
            $("#currentOpponentField").attr("disabled", true);
        }
    },

    toggleTabEdit: function ( gameSession ) {
        if ($("#tabState" + gameSession ).val() == "ro") {
            $(".editContainer" + gameSession).addClass("disablable disablable-disabled");
        } else if ($("#tabState" + gameSession).val() == "rw") {
            $(".editContainer" + gameSession).addClass("disablable disablable-enabled");
        }
    },

    addOnChangeToVehicleSelect: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "Vehicle").change(function () {
                $(this).find("option:selected").each(function () {
                    sessionConfig.updateVehicleClassCheckbox(this, gameSession);
                    sessionConfig.updateVehicleClassField(this, gameSession);
                });
            });
        });
    },

     addOnChangeToOpponentField: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "OpponentField").change(function () {
                $(this).find("option:selected").each(function () {
                    // This should be called onLoad as well, but Server side is taking care of preloading it
                    if( this.value == 0 ) {
                        $("#" + gameSession + "Vehicle").attr("disabled", true);
                    } else {
                        $("#" + gameSession + "Vehicle").removeAttr("disabled");
                    }
                    
                });
            });
        });
    },

    addOnChangeToStartType: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "RaceRollingStart").change(function () {
                $(this).find("option:selected").each(function () {
                    // This should be called onLoad as well, but Server side is taking care of preloading it
                    if( this.value == 0 ) { // "Standing"
                        $("#" + gameSession + "RaceFormationLap").val( 0 );
                        $("#" + gameSession + "RaceFormationLap").attr("disabled", true);
                    } else {
                        $("#" + gameSession + "RaceFormationLap").removeAttr("disabled");
                    }
                });
            });
        });
    },

    addOnChangeToGridLayout: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "GridLayout").change(function () {
                sessionConfig.setGridPositionStatus($(this), gameSession);
            });
        });
        sessionConfig.setGridPositionStatus($("#nextGridLayout"), "next"); // initial status only for Next
    },

    setGridPositionStatus: function( gridLayoutEl, gameSession ) {
        if ($(gridLayoutEl).val() == 5) { // 5 is the Custom value
            $("#" + gameSession + "GridPosition").removeAttr("disabled");
        } else {
            $("#" + gameSession + "GridPosition").attr("disabled", true);
        }
    },

    addOnChangeToTrackSelect: function (gameSession) {
        $("#" + gameSession + "Track").change(function () {
            sessionConfig.setMaxGridStatus($(this), gameSession);
        });
    },

    setMaxGridStatus: function( trackEl, gameSession ) {
        trackSize = trackEl.children(':selected').text().match( /([^()]+)/g);
        // this returns an array where the index 1 is the track size. 
        maxGridSize = parseInt( $("#" + gameSession + "MaxGridSize").val() );
        if( trackSize[1] < maxGridSize ) 
        {
            $("#" + gameSession + "MaxGridSize").val(trackSize[1]);
        } 
        sessionConfig.setMaxHumanOpponents($("#" + gameSession + "MaxGridSize"), gameSession);
    },

    addOnChangeToMaxGridSize: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            sessionConfig.setMaxHumanOpponents($("#" + gameSession + "MaxGridSize"), gameSession);// initial call
            $("#" + gameSession + "MaxGridSize").change(function () {
                sessionConfig.setMaxHumanOpponents($(this), gameSession);
            });
        });
    },

    setMaxHumanOpponents: function( maxGridSizeEl, gameSession ) {
        currentMaxOpponents = parseInt( $("#" + gameSession + "MaxHumanOpponents").val() );
        maxGridSize = parseInt( maxGridSizeEl.val() );
        if( currentMaxOpponents >= maxGridSize )
        {
            $("#" + gameSession + "MaxHumanOpponents").val(maxGridSize);
        }
    },

    addOnChangeToMaxHumanOpponents: function() {
        // keep this value one point below max grid size
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "MaxHumanOpponents").change(function () {
                sessionConfig.setMaxHumanOpponents($("#" + gameSession + "MaxGridSize"), gameSession);
            });
        });
    },


    addOnChangeToTrackCuttingPenalty: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            // this is a collection...
            trackCuttingPenaltyEl = $("input[name=" + gameSession + "TrackCuttingPenalty]");
            sessionConfig.toggleAllowableTimePenalty(trackCuttingPenaltyEl, gameSession);
            trackCuttingPenaltyEl.change(function () {
                sessionConfig.toggleAllowableTimePenalty($(this), gameSession);
            });
        });
    },

    toggleAllowableTimePenalty: function (trackCuttingPenaltyEl, gameSession) {
        trackCuttingPenaltyVal = 0;
        trackCuttingPenaltyEl.map(function () {
            if ( $(this).val() == 1 && $(this).is(":checked") ) {
                trackCuttingPenaltyVal = parseInt($(this).val());
            }
        });

        if (trackCuttingPenaltyVal > 0 ) {
            $("#" + gameSession + "AllowableTimePenalty").removeAttr('disabled');
        } else {
            $("#" + gameSession + "AllowableTimePenalty").attr('disabled', true);
        }
    },

    setupAllowableTimePenaltySlider: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "AllowableTimePenaltySlider").slider({
                value: $("#" + gameSession + "AllowableTimePenalty").val(),
                min: 1,
                max: 50,
                slide: function (event, ui) {
                    $("#" + gameSession + "AllowableTimePenalty").val(ui.value);
                }
            });
            $("#" + gameSession + "AllowableTimePenalty").val($("#" + gameSession + "AllowableTimePenaltySlider").slider("value"));
        });
    },

    updateVehicleClassField: function( selectedVehicle, gameSession ) {
        var vehicleClassId = vehicleClasses[selectedVehicle.value];
        $("#" + gameSession + "VehicleClass").val(vehicleClassId);
    },

    updateVehicleClassCheckbox: function( selectedVehicle, gameSession ) {
        var previousClassId = $("#" + gameSession + "VehicleClass").val();
        $("#" + gameSession + "VehicleClass_" + previousClassId).removeAttr('disabled');
        $("#" + gameSession + "VehicleClass_" + previousClassId).prop('checked', false);
        $("#" + gameSession + "VehicleClassLabel_" + previousClassId).removeAttr('class');
        var vehicleClassId = vehicleClasses[selectedVehicle.value];
        $("#" + gameSession + "VehicleClass_" + vehicleClassId).prop('checked', true);
        $("#" + gameSession + "VehicleClass_" + vehicleClassId).prop('disabled', true);
        $("#" + gameSession + "VehicleClassLabel_" + vehicleClassId).prop('class', 'selectedVehicleClass');
    },

    setupDatePickers: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        var sessionNames = sessionConfig.config.sessionNames;

        $.map(gameSessions, function (gameSession) {
            $.map(sessionNames, function (session) {
                var name = gameSession + session;
				if ( session == "Race" )
				{
					var dp = $("#" + name + "StartingDate").datepicker(webtool.config.commonDateFormat, {
						onSelect: function (dateText, inst) {
							$("#" + name + "StartingDate").val(dateText);
						}
					});
					$("#" + name + "StartingToggleDP").click(function (e) {
						dp.show().datepicker('show');
						//e.preventDefault();
					});
				}
            });
        });
    },

    setupRealWeatherToggles: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        var sessionNames = sessionConfig.config.sessionNames;

        $.map(gameSessions, function (gameSession) {
            $.map(sessionNames, function (session) {
                var name = gameSession + session;
                $("#" + name + "RealWeather").on("change", function () {
                    sessionConfig.toggleWeatherSlots(name);
                    sessionConfig.toggleWeatherProgression(name);
                });
            });
        });
    },

    addOnChangeToWeatherSlots: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        var sessionNames = sessionConfig.config.sessionNames;
        $.map(gameSessions, function (gameSession) {
            $.map(sessionNames, function (session) {
                var name = gameSession + session;
                $("#" + name + "WeatherSlots").on("change", function () {
                    sessionConfig.toggleUsedWeatherSlots(name);
                    sessionConfig.toggleWeatherProgression(name);
                });
                // in the init too
                if ($("#" + name + "RealWeather").prop('checked') == false) {
                    sessionConfig.toggleUsedWeatherSlots(name);
                }
            });
        });
    },

    toggleWeatherSlots: function( name ) {
        var weatherSlots = [1, 2, 3, 4];
        if ($("#" + name + "RealWeather").is(':checked')) {
            $.map(weatherSlots, function (slot) {
                $("#" + name + "WeatherSlot" + slot).attr('disabled', true);
            });
            $("#" + name + "WeatherSlots").attr('disabled', true);
        } else {
            $.map(weatherSlots, function (slot) {
                $("#" + name + "WeatherSlot" + slot).removeAttr('disabled');
            });
            $("#" + name + "WeatherSlots").removeAttr('disabled');
            sessionConfig.toggleUsedWeatherSlots(name);
        }
    },

    toggleUsedWeatherSlots: function( name ) {
        var maxSlots = $("#" + name + "WeatherSlots").val();
        for( var i = 1; i <= 4; i++ ) {
            if( i > maxSlots ) {
                $("#" + name + "WeatherSlot" + i).attr('disabled', true);            
            } else { 
                $("#" + name + "WeatherSlot" + i).removeAttr('disabled');            
            }
        }
    },

    toggleWeatherProgression: function( name ) {
        if ( $("#" + name + "RealWeather").is(':checked') || $("#" + name + "WeatherSlots").val() == 1 ) {
            $("#" + name + "WeatherProgression").attr('disabled', true);
        } else {
            $("#" + name + "WeatherProgression").removeAttr('disabled');
        }
    },

    handlePanelsStatusChanged: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        var sessionNamesNoRace = sessionConfig.config.sessionNames.slice(1); // we remove race. Assuming "Race" being the first index

        $.map(gameSessions, function (gameSession) {
            $.map(sessionNamesNoRace, function (session) {
                var name = gameSession + session;
                sessionConfig.togglePanel(name); // we execute it first onLoad
                $("#" + name + "TogglePanel").on("change", function () {
                    sessionConfig.togglePanel(name); // we execute it in onChange
                });
            });
        });
    },

    togglePanel: function (name) {
        if ($("#" + name + "TogglePanel").is(':checked')) {
            $("#" + name + "Panel :input").removeAttr("disabled");
            // If more classes are added to the panel, remove just the disabledPanel class
            $("#" + name + "Panel").removeAttr('class');
            if( $("#" + name + "Mins").val() == "0" )
            {
                $("#" + name + "Mins").val( "5" );
            }
        } else {
            $("#" + name + "Panel :input").attr('disabled', true);
            // If more classes are added to the panel, add disabledPanel class to the existing ones
            $("#" + name + "Panel").attr('class', "disabledPanel");
        }
        sessionConfig.toggleWeatherSlots(name);
    },

    setupYesNoButtons: function () {
        $("input.yesNoButton").checkboxradio({ icon: false });
    },

    setupAiSkillSlider: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "AiSkillSlider").slider({
                value: $("#" + gameSession + "AiSkill").val(),
                min: 70,
                max: 120,
                slide: function (event, ui) {
                    $("#" + gameSession + "AiSkill").val(ui.value + "%");
                }
            });
            $("#" + gameSession + "AiSkill").val($("#" + gameSession + "AiSkillSlider").slider("value") + "%");
        });
    },

    setupMinPlayerStrengthSlider: function () {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("#" + gameSession + "MinPlayerStrengthSlider").slider({
                value: $("#" + gameSession + "MinPlayerStrength").val(),
                min: 100,
                max: 5000,
                step: 10,
                slide: function (event, ui) {
                    $("#" + gameSession + "MinPlayerStrength").val(ui.value);
                }
            });
            $("#" + gameSession + "MinPlayerStrength").val($("#" + gameSession + "MinPlayerStrengthSlider").slider("value"));
        });
    },

    addOnChangeToMultiClassCheckboxes: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("input[name=" + gameSession + "VehicleClassCheckbox]").on("change", function () {
                var classChanged = $(this).val();
                if ( $(this).is(':checked') ) {
                    $( "#" + gameSession + "VehicleClassLabel_" + classChanged ).attr('class', "selectedVehicleClass");
                } else {
                    $( "#" + gameSession + "VehicleClassLabel_" + classChanged ).removeAttr('class');
                }
            });
        
        });
    },

    addOnChangeToLengthType: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            $("input[name=" + gameSession + "LengthType]").on("change", function () {
                var classChanged = $(this).val();
                if ( $(this).is(':checked') && $(this).attr('id') == gameSession + "RadioMins" ) {
                    $( "#" + gameSession + "RaceMandatoryPitStops").val(0);
                    $( "#" + gameSession + "RaceMandatoryPitStops").attr("disabled", true);
                } else {
                    $( "#" + gameSession + "RaceMandatoryPitStops").removeAttr("disabled");
                }
            });
        
        });
    },
    
    addOnChangeToApplyToNext: function() {
        $("#applyToNext").on("change", function () {
            if ( $(this).is(':checked') )
            {
                $( "#onlyNextSessionAttributes input").each(function(i, obj) {
                    $( obj ).removeAttr("disabled");
                });
                $( "#onlyNextSessionAttributes input[type=radio]").each(function(i, obj) {
                    $( obj ).button("refresh");
                });
                $( "#currentGridLayout" ).removeAttr("disabled");
                $( "#onlyNextSessionAttributes").removeClass("disabledPanelNextSessionOnly");
                // call to set elements affected by this
                sessionConfig.setGridPositionStatus($("#currentGridLayout"), "current");
            } else {
                $( "#onlyNextSessionAttributes input").each(function(i, obj) {
                    $( obj ).attr("disabled", true);
                });
                $( "#onlyNextSessionAttributes input[type=radio]").each(function(i, obj) {
                    $( obj ).button("refresh");
                });
                $( "#currentGridLayout" ).attr("disabled", true);
                $( "#onlyNextSessionAttributes").addClass( "disabledPanelNextSessionOnly" );
            }
        });
    },

    addOnChangeToRulesAndPenalties: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            // this is a collection...
            rulesAndPenaltiesEl = $("input[name=" + gameSession + "Flags]");
            // a first execution when this onChange is hooked, to be called onLoad
            sessionConfig.toggleRulesAndRegulations(rulesAndPenaltiesEl, gameSession);
            rulesAndPenaltiesEl.change(function () {
                sessionConfig.toggleRulesAndRegulations($(this), gameSession);
            });
        });
    },

    toggleRulesAndRegulations: function (rulesAndPenaltiesEl, gameSession) {
        rulesAndPenaltiesEl.map(function () {
            if ($(this).val() == 0 && $(this).is(':checked') )  {
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv input").each(function(i, obj) {
                    $( obj ).attr("disabled", true);
                });
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv input[type=radio]").each(function(i, obj) {
                    $( obj ).button("refresh");
                });
                $( "#"+ gameSession + "MinimumOnlineRank" ).attr("disabled", true);
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv").addClass("disabledPanel");   

            }
            else if ($(this).val() == 1 && $(this).is(':checked') )  {
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv input").each(function(i, obj) {
                    $( obj ).removeAttr("disabled");
                });
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv input[type=radio]").each(function(i, obj) {
                    $( obj ).button("refresh");
                });
                $( "#"+ gameSession + "MinimumOnlineRank" ).removeAttr("disabled");
                $( "#"+ gameSession + "RulesAndPenaltiesContainerDiv").removeClass("disabledPanel");

                // calls to the other toggles that are affected the values modified here
                trackCuttingPenaltyEl = $("input[name=" + gameSession + "TrackCuttingPenalty]");
                sessionConfig.toggleAllowableTimePenalty(trackCuttingPenaltyEl, gameSession);

                onlineReputationEl = $("input[name=" + gameSession + "OnlineReputation]");
                sessionConfig.toggleLicense(onlineReputationEl, gameSession);
            }
            
        });
    },

    addOnChangeToCompetitiveRacingLicense: function() {
        var gameSessions = sessionConfig.config.gameSessions;
        $.map(gameSessions, function (gameSession) {
            // this is a collection...
            onlineReputationEl = $("input[name=" + gameSession + "OnlineReputation]");
            // a first execution when this onChange is hooked, to be called onLoad
            sessionConfig.toggleLicense(onlineReputationEl, gameSession);
            onlineReputationEl.change(function () {
                sessionConfig.toggleLicense($(this), gameSession);
            });
        });
    },

    toggleLicense: function (onlineReputationEl, gameSession) {
        onlineReputationEl.map(function () {
            if ($(this).val() == 0 && $(this).is(':checked') )  {
                $( "#"+ gameSession + "MinimumOnlineRank" ).attr("disabled", true);
                $( "#"+ gameSession + "MinPlayerStrength" ).attr("disabled", true);
            }
            else if ($(this).val() > 0 && $(this).is(':checked') )  {
                $( "#"+ gameSession + "MinimumOnlineRank" ).removeAttr("disabled");
                $( "#"+ gameSession + "MinPlayerStrength" ).removeAttr("disabled");
            }
        });
    },


    /**
    * Validates and rounds up Mins as multipliers of 5
    */
    roundUpMins: function (sessionName, raceLength) {
        if ( raceLength % 5 )
        {
            roundedUp = Math.ceil( raceLength/5 )*5;
            alert( "Minutes in " + sessionName + " need to be multipliers of 5. Rounding up to " + roundedUp );
            return roundedUp;
            
        }
        return raceLength;
    },


    /*
    * Main submit method. 
    * TODO implement validators
    * It takes "next" or "current" as the argument.
    */
    saveAttributes: function (sessionToModify) {

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
        apiUrl = apiUrl + "session_AllowedCutsBeforePenalty=" + allowableTimePenalty + ampersand;

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

        console.log(apiUrl);

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
    },

    serverControlsClass: function (gameSession) {
        return (gameSession == "current" && $("#serverControlClassCurrent").val() == "true") ||
               (gameSession == "next" && ( $("#changeClass").prop("checked") == false ) ) ;
    },

    serverControlsVehicle: function( gameSession ) {
        return (gameSession == "current" && $("#serverControlVehicleCurrent").val() == "true") || 
               (gameSession == "next" && ($("#changeVehicle").prop("checked") == false));
    },

    serverControlsTrack: function (gameSession) {
        return (gameSession == "current" && $("#serverControlTracksCurrent").val() == "true") ||
               (gameSession == "next" && ($("#changeTrack").prop("checked") == false));
    },

    /**
    * Attributes common to Race, Practice and Qualifying panels.
    * There's some exceptional cases for Race, which are treated here instead of outside the function.
    */
    commonPanelAttributes: function (sessionToModify, sessionName, ampersand) {
        apiUrl = "";
        var attrNamePrefix = sessionName;
        if ( sessionName == "Qualifying" )
        {
            attrNamePrefix = "Qualify";
        }

        // Cases for quali and practice
        if (sessionName != "Race") {
            if ($("#" + sessionToModify + sessionName + "TogglePanel").prop("checked" ) == true) {
                raceLength = $("#" + sessionToModify + sessionName + "Mins").val();
                raceLength = sessionConfig.roundUpMins( sessionName, raceLength );
            } else {
                raceLength = 0;
            }
            apiUrl = apiUrl + "session_" + attrNamePrefix + "Length=" + raceLength + ampersand;
            if( raceLength == 0 ) {
                // If the length is 0, stop processing attributes and send the "disable" mark. 
                return apiUrl;
            }
        } else {
            var timedRaceFlagValue = $("input[name=" + sessionToModify + "LengthType]:checked").val();
            lengthType = timedRaceFlagValue > 0 ? "Mins" : "Laps";
            raceLength = $("#" + sessionToModify + "Race" + lengthType).val();
            if( lengthType == "Mins" ) {
                raceLength = sessionConfig.roundUpMins( "Race", raceLength );
            }
            apiUrl = apiUrl + "session_RaceLength=" + raceLength + ampersand;
        }

        dateString = $("#" + sessionToModify + sessionName + "StartingDate").val();
        parsedDateTime = dateString.split(/-| |:/);

        monthLetters = parsedDateTime[1];
        month = webtool.config.monthsByLetter[monthLetters.toUpperCase()];	
		
        if (parsedDateTime[0] != "") {
            apiUrl = apiUrl + "session_" + attrNamePrefix + "DateDay=" + parsedDateTime[0] + ampersand;
            apiUrl = apiUrl + "session_" + attrNamePrefix + "DateMonth=" + month + ampersand;
            apiUrl = apiUrl + "session_" + attrNamePrefix + "DateYear=" + parsedDateTime[2] + ampersand;
        }
        hour = $("#" + sessionToModify + sessionName + "StartingTime").val();
        apiUrl = apiUrl + "session_" + attrNamePrefix + "DateHour=" + hour + ampersand;

        realWeather = $("#" + sessionToModify + sessionName + "RealWeather").prop("checked");
        if (realWeather) {
            apiUrl = apiUrl + "session_" + attrNamePrefix + "WeatherSlots=0" + ampersand;
        }
        else{
            weatherSlots = 0;
            $("select." + sessionToModify + "." + sessionName + ".weatherSelect").each(function (index) {
                weather = parseInt($(this).val());
                if (weather != 0) {
                    weatherSlots++;
                    apiUrl = apiUrl + "session_" + attrNamePrefix + "WeatherSlot" + weatherSlots + "=" + weather + ampersand;
                }
            });
            weatherSlotsNumber = $("#" + sessionToModify + sessionName + "WeatherSlots").val();    
            apiUrl = apiUrl + "session_" + attrNamePrefix + "WeatherSlots=" + weatherSlotsNumber + ampersand;
            
        }
        
        weatherProgression = $("#" + sessionToModify + sessionName + "WeatherProgression").val();
        apiUrl = apiUrl + "session_" + attrNamePrefix + "WeatherProgression=" + weatherProgression + ampersand;
        dateProgression = $("#" + sessionToModify + sessionName + "DateProgression").val();
        apiUrl = apiUrl + "session_" + attrNamePrefix + "DateProgression=" + dateProgression + ampersand;

        return apiUrl;
    }


}

$(document).ready(sessionConfig.init);
