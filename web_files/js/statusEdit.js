
var statusEdit = {

	    init: function() {

			statusEdit.config = {
			     	trackSelect: $( "#trackSelect" ),
	        };

	        statusEdit.setup();
			$( startingRaceDate ).datetimepicker( webtool.config.commonDateTimeFormat );
	    },
	    
	    setup: function() {
	    	
	    },
		
		saveAttributes: function() {
			
			$( "#attributesForm" ).validate({
				rules: {
					GridSize: { required: true, notEmpty: true, digits: true },
					MaxPlayers: { required: true, notEmpty: true, digits: true },
					OpponentDifficulty: { required: true, notEmpty: true, percentage: true },
					startingRaceDate: { required: true, notEmpty: true, dateRequiredWithFormat: true }, 
					Practice1Length: { required: true, notEmpty: true, digits: true },
					Practice2Length: { required: true, notEmpty: true, digits: true },
					Qualify1Length: { required: true, notEmpty: true, digits: true },
					Qualify2Length: { required: true, notEmpty: true, digits: true },
					WarmupLength: { required: true, notEmpty: true, digits: true },
					Race1Length: { required: true, notEmpty: true, digits: true },
				},
  			});
			
			ampersand = "&";
			apiUrl = "/api/session/";
			sessionToModify = $( "#sessionToModify" ).val();
			if( sessionToModify == "current" ) {
				apiUrl = apiUrl + "set_attributes?copy_to_next=false&amp;";
			}
			else if( sessionToModify == "next" ) {
				apiUrl = apiUrl + "set_next_attributes?";
			}
			else if( sessionToModify == "both" ) {
				apiUrl = apiUrl + "set_attributes?copy_to_next=true" + ampersand;
			}
			
			flags = 0;
			$( "#Flags > option:selected" ).each( function( index ) {
				console.log( $( this ).val() );
				flags = flags + parseInt( $( this ).val() );
				console.log( flags );
			});
			apiUrl = apiUrl + "session_Flags=" + flags + ampersand;
			
			dateString = $( "#startingRaceDate" ).val();
			parsedDateTime = dateString.split(/-| |:/);
			// TODO confirm if numbers are 0 based 
			apiUrl = apiUrl + "DateYear=" + parsedDateTime[0] + ampersand;
			apiUrl = apiUrl + "DateMonth=" + parsedDateTime[1]  + ampersand;
			apiUrl = apiUrl + "DateDay=" + parsedDateTime[2] + ampersand;
			apiUrl = apiUrl + "DateHour=" + parsedDateTime[3] + ampersand;
			apiUrl = apiUrl + "DateMinute=" + parsedDateTime[4] + ampersand;
			
			$( "input[type=\"text\"]" ).each( function( index ) {
				name = $( this ).attr( "name");
				if( name == "startingRaceDate" ) {
					// startingRaceDate gets special treatment earlier, skip.
					return;
				}
				if( name == "sessionToModify" ) {
					// sessionToModify gets special treatment earlier. Skip.
					return;
				}
				apiUrl = apiUrl + "session_" + $( this ).attr( "name" ) + "=" + $( this ).val() + ampersand;
			});
			$( "select" ).each( function( index ) {
				name = $( this ).attr( "name");
				if( name == "Flags" ) {
					// Flags gets special treatment, done earlier. Skip.
					return;
				}
				apiUrl = apiUrl + "session_" + $( this ).attr( "name" ) + "=" + $( this ).val() + ampersand;
			});
			
			console.log( apiUrl );
			
			$.get( apiUrl, function( data ) {
				// TODO extract the json / html result + put it in "refresh" URL as param
				//$( ".result" ).html( data );
				result = "ok";
				var redirectUrl = "statusEdit?result=" + result;
				window.location.href = redirectUrl;
				//console.log( data );
			});
		},

}

$( document ).ready( statusEdit.init );
