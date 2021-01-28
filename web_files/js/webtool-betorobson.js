var sessionMembersBetoRobson = {
	init: function(){
		sessionMembersBetoRobson.memberActions();
		sessionMembersBetoRobson.sessionActions();
	},

	sessionActions: function(){
        $('#serverDetails').prepend(`<div>

		   <form onsubmit="return sessionMembersBetoRobson.sendCustomMessage(null, this)">
			   <input type="text" placeholder="Message to everyone" />
		   </form>

		   <div>
			   <button
				   class="btn btn-success"
				   onclick="sessionMembersBetoRobson.launch10()"
			   >Launch in 10 seconds</button>
			   <button
				   class="btn btn-info"
				   onclick="sessionMembersBetoRobson.nextSession()"
			   >Jump to next session</button>
			   <button
				   class="btn btn-danger"
				   onclick="sessionMembersBetoRobson.restart()"
			   >Restart server and drop everyone</button>
		   </div>

        </div>`);
	},

	memberActions: function(){
		$('tr[id^=row_members]').each(function(index, member){
			var refid = $(member).find('dd:nth-child(4)').html();
			var num = $(member).attr('id').replace(/row_members_/,'');
			$(member).prev().css('cursor', 'pointer');
			$(member).prev().on('click', function(){
				javascript:webtool.toggleRow('#' + $(member).attr('id'));
			});
			$(member).find('td').prepend(`
			    <div>
			           <form onsubmit="return sessionMembersBetoRobson.sendCustomMessage(${refid}, this)">
			               <input type="text" placeholder="Message" />
			           </form>
			           <button
			               class="btn btn-danger"
			               onclick="sessionMembersBetoRobson.sendMessage(${refid}, $(this).html(), ${num}, 4)"
			           >Stop n Go 10 second</button>
			           <button
			               class="btn btn-danger"
			               onclick="sessionMembersBetoRobson.sendMessage(${refid}, $(this).html(), ${num}, 4)"
			           >Drive-through penalty</button>
			           <button
			               class="btn btn-danger"
			               onclick="sessionMembersBetoRobson.kick(${refid}, ${num})"
			           >Kick</button>
			    </div>
			`);
		});
	},
	sendCustomMessage: function(refid, message){
		   var customMessage = $(message).find('input').val();
		   $(message).find('input').val('');
		   this.sendMessage(refid, customMessage);
		   return false;
	},
	kick: function(refid, num){

		var r = false;

		if(typeof num != 'undefined'){
			var name = $('#row_members_' + num).prev().find('td:nth-child(2)').text();
			r = confirm('kick ' + name + '?');
		}

		if(!r){
			return;
		}

		$.get(`/api/session/kick?refid=${refid}`);

	},

	nextSession: function(refid, num){

		var r = false;

		r = confirm('Jump to the next session? If it is race, it will relaunch the race');

		if(!r){
			return;
		}

		sessionMembersBetoRobson.sendMessage(null, 'Jumping to next sesstion in 5 seconds!');

		setTimeout(function(){
			$.get('/api/session/advance');
		}, 10000);

	},

	restart: function(refid, num){

		var r = false;

		r = confirm('Restart server and drop everyone?');

		if(!r){
			return;
		}

		sessionMembersBetoRobson.sendMessage(null, 'Restart server and drop everyone in 5 seconds!');

		setTimeout(function(){
			$.get('/api/restart');
		}, 10000);

	},

	launch10: function(){

		var r = false;

	    r = confirm('Launch in 10 seconds?');

		if(!r){
			return;
		}

		$.get(`/api/session/send_chat?message=!!!!!!!!`)
			.then(() => $.get(`/api/session/send_chat?message=${encodeURIComponent('Launch in 10 seconds')}`)
				.then(() => {

					setTimeout(function(){
			      $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
			      $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
			      $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
					}, 10000);

				})
			);

		// for(var i=11; i>0; i--){
		// 	(function(i){
		// 		setTimeout(function(){
		// 			var timer = 11 - i;
		// 			if(timer === 0){
  //                       $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
  //                       $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
  //                       $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
  //                       $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
  //                       $.get(`/api/session/send_chat?message=${encodeURIComponent('GO GO GO GO GO GO GO GO GO')}`)
		// 			}else{
		// 				$.get(`/api/session/send_chat?message=!!!!!!!!`)
		// 					.then(() => $.get(`/api/session/send_chat?message=${encodeURIComponent('Launch in ' + timer +  ' seconds')}`));
		// 			}
		// 		}, i * 1000);
		// 	})(i)
		// }

	},

	sendMessage: function(refid, message, num, times){

		var nMessage = encodeURIComponent('!!!!! ' + message);

		var r = false;

		if(typeof num != 'undefined'){
			var name = $('#row_members_' + num).prev().find('td:nth-child(2)').text();
			r = confirm(message + ' ' + name + '?');
			if(!r){
				return;
			}
		}

		if(!times){
			var times = 1;
		}


		for(var i=1; i<=times; i++){

			(function(i){

				setTimeout(function(){

					if(refid){
						$.get(`/api/session/send_chat?refid=${refid}&message=!!!!!!!!!!`)
							.then(() => $.get(`/api/session/send_chat?refid=${refid}&message=${nMessage}`));
					}else{
						$.get(`/api/session/send_chat?message=!!!!!!!!!!`)
							.then(() => $.get(`/api/session/send_chat?message=${nMessage}`));
					}

				}, i * 3000);

			})(i);

		}

		return false;

	}
}

$(document).ready(sessionMembersBetoRobson.init)
