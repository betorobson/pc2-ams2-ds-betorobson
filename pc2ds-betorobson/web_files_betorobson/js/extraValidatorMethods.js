/**
 * Extra validator methods. To be used with jquery validator module
 * 
 */
var extraValidator = {
		
    init: function() {
    	
        extraValidator.config = {
        };

        extraValidator.addMethods();
    },
    
    /**
     * 
     */
    addMethods: function ( ) {
    	jQuery.validator.addMethod( "percentage", function( value, element ) {
    		return ( parseInt( value.trim() ) <= 100 && parseInt( value.trim() ) >= 0 );
    	}, "Value must be between 0 and 100.");
    	
    	jQuery.validator.addMethod( "greaterThanZero", function( value, element ) {
    	    return ( parseInt( value.trim() ) > 0 );
    	}, "Value must be greater than 0.");
    	
    	jQuery.validator.addMethod( "positiveNumber", function( value, element ) {
    		return ( Number( value.trim() ) >= 0 );
    	}, "Enter a positive number. 0 included.");
    	
    	jQuery.validator.addMethod( "byteRange", function( value, element ) {
    	    return ( ( parseInt( value.trim() ) >= -128 ) && ( parseInt( value.trim() ) <= 127 ) );
    	}, "Value too large.");

    	jQuery.validator.addMethod( "intRange", function( value, element ) {
    		return ( ( parseInt( value.trim() ) >= -2147483648 ) && ( parseInt( value.trim() ) <= 2147483647 ) );
    	}, "Value too large.");
    	
       	jQuery.validator.addMethod( "dateRequiredWithFormat", function( value, element ) {
				// Very basic regex to check date format. Extended check done in the server. 
				// Ranges are not validated. If number of any field exceeds the range, 
				// it adds the excess to higher fields, causing confusion, as the server
				// side still receives a valid date, but probably not the originally intended one.
				dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/; 
				validFormat = dateRegex.test( value.trim() )  
				if ( !validFormat ) {
					return false;
				}
				return true;
			}, "Date needs to be formatted in yyyy-MM-dd HH:mm.");

       	jQuery.validator.addMethod( "dateOptionalWithFormat", function( value, element ) {
       		if( value != null && value.trim() != "" ) {
           		// Very basic regex to check date format. Extended check to be done in the server. 
           		dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/; 
           		validFormat = dateRegex.test( value.trim() )  
           		if ( !validFormat ) {
           			return false;
           		}       			
       		}
       		return true;
       	}, "Date needs to be empty or formatted in yyyy-MM-dd HH:mm:ss.");
    },

}

$( document ).ready( extraValidator.init );