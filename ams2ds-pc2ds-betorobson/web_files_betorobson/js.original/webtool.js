var webtool = {

	    init: function() {

			webtool.config = {
				commonDateTimeFormat: { 
	        		dateFormat: 'yy-mm-dd',
	        		hourGrid: 4,
	        		minuteGrid: 10,
	        		timeFormat: 'HH:mm', 
	        		showMinute: false,
					showSecond: false,
        		},
        		commonDateFormat: { 
	        		dateFormat: 'dd M yy',
        		},
        		monthsByLetter: {
        		    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 2 
        		},
			};
	    },

	    toggleRow: function( rowId ) {
			if( $( rowId ).is(':visible') ) {
				$( rowId ).hide();
			}
			else {
				$( rowId ).show();
			}
	    },

	    getParameterByName: function (name, url) {
            if (!url) url = window.location.href;
            name = name.replace(/[\[\]]/g, "\\$&");
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        },
}

$( document ).ready( webtool.init );
