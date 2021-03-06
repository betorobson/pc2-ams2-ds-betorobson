var sessionMembersBetoRobson = {
	init: function(){
		sessionMembersBetoRobson.memberActions();
		sessionMembersBetoRobson.sessionActions();
	},

	sessionActions: function(){
		$('#serverDetails').prepend(`<div>

			<form onsubmit="return sessionMembersBetoRobson.sendCustomMessage(null, this)">
				<input class="form-control" type="text" placeholder="Message to everyone" />
			</form>

			<div>

			<button
				class="btn btn-success"
				style="margin: 8px"
				onclick="sessionMembersBetoRobson.launch('prepare', this)"
			>Prepare for Launch</button>

			<button
				class="btn btn-success"
				style="margin: 8px"
				onclick="sessionMembersBetoRobson.launch('go', this)"
			>GO GO GO</button>

			<button
					style="margin: 8px"
					class="btn btn-warning"
					onclick="sessionMembersBetoRobson.flags('Safety Car OUT SLOW DOWN !!!')"
			>Safety car OUT</button>

			<button
					style="margin: 8px"
					class="btn btn-warning"
					onclick="sessionMembersBetoRobson.flags('Safety Car IN THIS LAP !!!')"
			>Safety car IN</button>

			<button
					style="margin: 8px"
					class="btn btn-warning"
					onclick="sessionMembersBetoRobson.flags('VIRTUAL Safety Car SLOW DOWN!!!')"
			>VIRTUAL Safety car</button>

			<button
				class="btn btn-info"
				style="margin: 8px"
				onclick="sessionMembersBetoRobson.nextSession()"
			>Jump to next session</button>

			<button
				class="btn btn-danger"
				style="margin: 8px"
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
				$(member).prev().find('td:nth-child(2)').html(
					$(member).prev().find('td:nth-child(2)').text()
				);
				$(member).prev().find('td:nth-child(7)').html(
					$(member).prev().find('td:nth-child(7) a').text()
				);
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

	flags: function(message){

		var r = confirm(message + '?');

		if(!r){
			return;
		}

		this.sendMessage(null, message, undefined, 3);

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

		sessionMembersBetoRobson.sendMessage(null, 'Jumping to next sesstion!');

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
			$.get('/api/restart')
				.then(() => $.get('/api/session/set_next_attributes?session_VehicleModelId=1785300635&session_TrackId=-559709709&session_RaceLength=10&session_RaceDateHour=0&session_RaceWeatherSlots=0&session_RaceWeatherProgression=1&session_RaceDateProgression=0&session_RaceFormationLap=0&session_RaceMandatoryPitStops=0&session_RaceRollingStart=0&session_PracticeLength=30&session_PracticeDateHour=0&session_PracticeWeatherSlots=0&session_PracticeWeatherProgression=1&session_PracticeDateProgression=0&session_QualifyLength=15&session_QualifyDateHour=0&session_QualifyWeatherSlots=0&session_QualifyWeatherProgression=1&session_QualifyDateProgression=0&session_AllowedViews=0&session_DamageType=1&session_FuelUsageType=2&session_TireWearType=8&session_ManualPitStops=0&session_OpponentDifficulty=0&session_VehicleClassId=0&session_MultiClassSlots=0&session_MinimumOnlineRank=0&session_MinimumOnlineStrength=100&session_PenaltiesType=1&session_AllowablePenaltyTime=0&session_DriveThroughPenalty=0&session_PitWhiteLinePenalty=0&session_ServerControlsVehicleClass=1&session_ServerControlsTrack=1&session_ServerControlsVehicle=0&session_GridSize=32&session_MaxPlayers=31&session_GridLayout=0&session_Flags=17433832&'));
		}, 5000);

	},

	launch: function(type, elem){

		var r = false;

	    r = confirm($(elem).text() + '?');

		if(!r){
			return;
		}

		if(type === 'prepare'){

			$.get(`/api/session/send_chat?message=${encodeURIComponent('--- ||| Prepare for launch ||| --- ')}`)

		}else if(type === 'go'){

			$.get(`/api/session/send_chat?message=${encodeURIComponent('--- ||| GO GO GO GO GO GO ||| --- ')}`)

		}

	},

	sendMessage: function(refid, message, num, times){

		var nMessage = encodeURIComponent(' --- ||| ' + message + ' ||| --- ');

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
						$.get(`/api/session/send_chat?refid=${refid}&message=${nMessage}`);
					}else{
						$.get(`/api/session/send_chat?message=${nMessage}`);
					}

				}, (i === 1 ? 0 : (i - 1) * 2000) );

			})(i);

		}

		return false;

	}
}

$(document).ready(sessionMembersBetoRobson.init)
