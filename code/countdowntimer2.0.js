/*
	jQuery Countdown Timer Plugin v2.0
	Copyright © 2011 Daniel Thomson
	
	Licensed under the MIT license:
	http://www.opensource.org/licenses/mit-license.php
*/

// TO DO:
// process the date and turn it into something I can use using the date format option
// be able to use am/pm in the plugin
// work out wether the date is crossing any daylight savings zones - DisplayDstSwitchDates() - http://www.codeproject.com/KB/datetime/DSTCalculator.aspx looks like a good example

// Date Formats:
// 1. dd/mm/yyyy
// 2. mm/dd/yyyy
// 3. dd-mm-yyyy
// 4. mm-dd-yyyy
// 5. dd mm yyyy
// 6. mm dd yyyy
// 7. dd,mm,yyyy
// 8. mm,dd,yyyy
// 9. dd.mm.yyyy
// 10. mm.dd.yyyy
// Supported time formats: "hh.mm.ss, hh-mm-ss, hh mm ss

// need to add settings to pick what units to show
// v 1.0 - initial countdown clock build
// v 2.0 - integration into my new plugin architecture: https://github.com/dansdom/plugins-template-v2

(function ($) {
	// this ones for you 'uncle' Doug!
	'use strict';
	
	// Plugin namespace definition
	$.Countdown = function (options, element, callback)
	{
		// wrap the element in the jQuery object
		this.el = $(element);
		// this is the namespace for all bound event handlers in the plugin
		this.namespace = "countdown";
		// extend the settings object with the options, make a 'deep' copy of the object using an empty 'holding' object
		this.opts = $.extend(true, {}, $.Countdown.settings, options);
		this.init();
	};
	
	// these are the plugin default settings that will be over-written by user settings
	$.Countdown.settings = {
		clockID : "#countdown",		// this selector will only be for optimisation - maybe, we'll see if I need it
		showYear : true,			// flag to show/hide year display
		showMonth : true,			// flag to show/hide month display
		showDay : true,				// flag to show/hide day display
		showHour : true,			// flag to show/hide hour display
		showMinute : true,			// flag to show/hide minute display
		showSecond : true,			// flag to show/hide second display
		endDate : "19.12.2020",  
		endTime : "14.30.00",  		// for coding convenience I'm going to force 24hr time for now. will support am or pm in the future
		dateFormat : "dd-mm-yyyy", 	// thinking of supporting dd-mm-yyyy as well
		finishedMessage : "<h1>The time has come!</h1>",
		digitHeight : 55,
		digitWidth : 55,
		timezone : 0,				// timezone adjuster
		serverTime : false,			// a flag to use the current time of the server
		currentTime : null,			// let's the user set the time from the server
		currentDate : null			// let's the user set the date from the server
	};
	
	// plugin functions go here
	$.Countdown.prototype = {
		init : function() {
			// going to need to define this, as there are some anonymous closures in this function.
			// something interesting to consider
			var clock = this;
			
			// this seems a bit hacky, but for now I will unbind the namespace first before binding
			this.destroy();
			
			this.el.timer = 0;	
			this.el.hasFocus = true;
			
			// make the markup for the clock
			this.makeClock();
			
			// I should probably do my cock.seconds etc definitions here
			this.el.seconds = this.el.find(".seconds");
			this.el.minutes = this.el.find(".minutes");
			this.el.hours = this.el.find(".hours");
			this.el.days = this.el.find(".days");
			this.el.months = this.el.find(".months");
			this.el.years = this.el.find(".years");
			//console.log("setting clock position");
			// now I can hide those units that I dont want
			
			// get the finish date
			this.el.endTime = this.parseDate(this.opts.endTime, this.opts.endDate);
			// find the adjusted time if the option is set, this will then become the end date of the countdown
			if (this.opts.serverTime)
			{
				// this will need to be compared to a time send from the server and modified accordingly
				var realTime = this.parseDate(this.opts.currentTime, this.opts.currentDate),
					timeDiff = this.findTimeDiff(realTime, this.el.endTime),
					// get the current time
					timeNow = new Date(),
					correctedTime;
					
				// invert the values so I can find the time left
				$.each(timeDiff, function(index, value) {
					timeDiff[index] = -value;
				});
				
				// get the current time and store as an object
				this.el.currentTime = this.getTime(timeNow);
				// find the correct time as passes into the plugin
				correctedTime = this.correctTime(this.el.currentTime, timeDiff);
				// set the adjusted end time
				this.el.endTime = correctedTime;
			}
			// maybe wrap up all the functions that start the clock up into one method that can be called at the end of every minute
			// every minute maybe reset the clock again. find out how much time is left, set the clock and then put the timer back on
			// only needed once so putting it on document.focus()
			this.start();
			
			// set event handling for document blur event so that I can set up the clock again			
			$(document).bind('focus.' + clock.namespace, function(){
				clearTimeout(clock.el.timer);
				clock.start();
				//console.log("setting up the clock again");
				clock.el.hasFocus = true;
			});			
			
			$(document).bind('blur.' + clock.namespace, function(){
				//console.log("the document has blurred");
				clearTimeout(clock.el.timer);
				clock.el.hasFocus = false;
			});	
			
		},
		// initialise the clock, ready for the next minutes countdown
		start : function()
		{
			var clock = this;
			// console.log("countdown.init()");
			// stop any timed events
			clearTimeout(this.el.timer);
			
			// get the current time
			var timeNow = new Date();
			this.el.currentTime = this.getTime(timeNow);
			
			// define the reset status so I can pass it around?
			this.el.resetStatus = false;
				
			// find the time that has left to run on the clock
			//console.log("finding the time left. end time:");
			//console.log(this.el.endTime);
			//console.log("current time");
			//console.log(this.el.currentTime);
			this.el.timeLeft = this.findTimeDiff(this.el.currentTime, this.el.endTime);
			//console.log(this.el.endTime);
			
			// maybe this is where I need to test if the clock is done already?
			if (this.el.timeLeft.year < 0)
			{
				//console.log(this.el.timeLeft.year);
				//console.log("finishing");
				this.finish();
				return;
			}
			
			// set the zeros on the clock
			this.setZeros(this.el.timeLeft, this.el.currentTime);
				
			// set the starting position on the clock
			this.setClock();
				
			// start the timer on the clock
			this.el.timer = setTimeout(function(){clock.timeClock();}, 1000);
			
		},
		// make the markup for the clock
		makeClock : function()
		{
			//console.log("countdown.makeClock");
			var digitList = '<div class="digits"><div class="digitWrap"><ul><li class="n0">0</li><li class="n1">1</li><li class="n2">2</li><li class="n3">3</li><li class="n4">4</li><li class="n5">5</li><li class="n6">6</li><li class="n7">7</li><li class="n8">8</li><li class="n9">9</li></ul><div class="zero n0">0</div></div></div>',
				years = '<div class="years"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>years</label></div>',
				months = '<div class="months"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>months</label></div>',
				days = '<div class="days"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>days</label></div>',
				hours =  '<div class="hours"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>hours</label></div>',
				minutes = '<div class="minutes"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>minutes</label></div>',
				seconds = '<div class="seconds"><div class="tens">' + digitList + '</div><div class="ones">' + digitList + '</div><label>seconds</label></div>',
				clockPane = '<div class="clock">' + years + months + days + hours + minutes + seconds + '</div>';
			
			clockPane = '<div class="clock">';		
			// show only the parts of the clock that are set to visible	
			if (this.opts.showYear)
			{
				clockPane += years;
			}
			if (this.opts.showMonth)
			{
				clockPane += months;
			}
			if (this.opts.showDay)
			{
				clockPane += days;
			}
			if (this.opts.showHour)
			{
				clockPane += hours;			
			}
			if (this.opts.showMinute)
			{
				clockPane += minutes;
			}
			if (this.opts.showSecond)
			{
				clockPane += seconds;
			}
			clockPane += '</div>';
			// insert the html into the DOM and then style it	
			this.el.html(clockPane);
			this.el.find(".clock > div").css({
				"float"		: "left",
				"position"	: "relative"
			});
			this.el.find(".zero").css({
				"height"	: this.opts.digitHeight + "px",
				"width"		: this.opts.digitWidth + "px",
				"padding"	: "0px",
				"margin"	: "0px",
				"z-index"	: "2",
				"position"	: "absolute",
				"top"		: "0px",
				"left"		:"0px"
			});
			this.el.find(".tens, .ones").css({
				"float"		: "left",
				"position"	: "relative",
				"display"	: "block",
				"height"	: this.opts.digitHeight + "px",
				"width"		: this.opts.digitWidth + "px",
				"overflow"	: "hidden",
				"padding"	: "0px",
				"margin":"0px"
			});
			this.el.find(".digitWrap").css("position","relative");
			this.el.find(".tens .digits, .ones .digits").css({
				"position"	: "absolute",
				"top"		: "0px",
				"left"		: "0px",
				"width"		: this.opts.digitWidth + "px",
				"z-index"	: "1"
			});
			this.el.find(".tens li, .ones li").css({
				"display"	: "block",
				"height"	: this.opts.digitHeight + "px",
				"width"		: this.opts.digitWidth + "px",
				"list-style": "none",
				"padding"	: "0px",
				"margin"	: "0px"
			});
			// this line excludes the month number which will be set later
			this.el.find(".ones .zero").css("top", (10 * this.opts.digitHeight) + "px");
			this.el.find(".seconds .tens .zero, .minutes .tens .zero").css("top", (6 * this.opts.digitHeight) + "px");
			this.el.find(".hours .tens .zero").css("top", (3 * this.opts.digitHeight) + "px");		
			this.el.find(".months .tens .zero").css("top", (2 * this.opts.digitHeight) + "px");
			this.el.find(".years .tens .zero").css("top", (10 * this.opts.digitHeight) + "px");
		
		},
		// set the position of the clock
		setClock : function()
		{
			//console.log("countdown.setClock");
			var clockTime = this.el.timeLeft,
				digit = -this.opts.digitHeight,
				tens = ".tens .digits",
				ones = ".ones .digits",
				counter = {};
				
			// console.log(clockTime);
			// find the digits
			counter.secOnes = clockTime.seconds % 10;
			counter.secTens = Math.floor(clockTime.seconds / 10);
			counter.minOnes = clockTime.minutes % 10;
			counter.minTens = Math.floor(clockTime.minutes / 10);
			counter.hourOnes = clockTime.hours % 10;
			counter.hourTens = Math.floor(clockTime.hours / 10);
			counter.dayOnes = clockTime.day % 10;
			counter.dayTens = Math.floor(clockTime.day / 10);
			counter.monthOnes = clockTime.month % 10;
			counter.monthTens = Math.floor(clockTime.month / 10);
			counter.yearOnes = clockTime.year % 10;
			counter.yearTens = Math.floor(clockTime.year / 10);
			
			// console.log("setting the clock hands position");
			if (this.opts.showSecond)
			{
				this.el.seconds.find(ones).css("top", (counter.secOnes * digit) + "px");
				this.el.seconds.find(tens).css("top", (counter.secTens * digit) + "px");
			}
			if (this.opts.showMinute)
			{
				this.el.minutes.find(ones).css("top", (counter.minOnes * digit) + "px");
				this.el.minutes.find(tens).css("top", (counter.minTens * digit) + "px");		
			}
			if (this.opts.showHour)
			{
				this.el.hours.find(ones).css("top", (counter.hourOnes * digit) + "px");
				this.el.hours.find(tens).css("top", (counter.hourTens * digit) + "px");		
			}
			if (this.opts.showDay)
			{
				this.el.days.find(ones).css("top", (counter.dayOnes * digit) + "px");
				this.el.days.find(tens).css("top", (counter.dayTens * digit) + "px");
			}
			if (this.opts.showMonth)
			{
				this.el.months.find(ones).css("top", (counter.monthOnes * digit) + "px");
				this.el.months.find(tens).css("top", (counter.monthTens * digit) + "px");		
			}
			if (this.opts.showYear)
			{
				this.el.years.find(ones).css("top", (counter.yearOnes * digit) + "px");	
				this.el.years.find(tens).css("top", (counter.yearTens * digit) + "px");
			}
			
			this.el.count = counter;	
		},
		// clock timer function
		timeClock : function()
		{
			//console.log("countdown.timeClock");
			var clock = this,
				resetPos = 10,
				digit = -this.opts.digitHeight,
				counter = this.el.count,
				secOnesPos = this.el.count.secOnes,
				nextSecOnesPos,
				ones = ".ones .digits",	// for good code optimisation
				tens = ".tens .digits"; // for goot code optimisation			
															
			// need to optimise the selectors here with the digit objects I have just defined
			//console.log(counter.hourOnes);
			//console.log(counter.hourTens);
			if (counter.secOnes == 0)
			{	
				// *** end of second-ones: set it to the reset position and then test second-tens ***
				counter.secOnes = 10;
				if (this.opts.showSecond) { this.el.seconds.find(ones).css("top", (counter.secOnes * digit) + "px"); }
				
				if (counter.secTens == 0)
				{
					// flick on the reste flag at the end of every minute so that the clock will keep good time
					this.el.resetStatus = true;
					//console.log("reset status is true");
						
					// *** end of the second-tens: set it to the reset position and then test the minute-ones ***
					counter.secTens = 6;
					if (this.opts.showSecond) { this.el.seconds.find(tens).css("top", (counter.secTens * digit) + "px"); }
					
					if (counter.minOnes == 0)
					{					
						// *** end of the minute-ones: set it to the reset position and then test the minute-tens ***
						counter.minOnes = 10;
						if (this.opts.showMinute) { this.el.minutes.find(ones).css("top", (counter.minOnes * digit) + "px"); }
						
						if (counter.minTens == 0)
						{
							// *** end of the minute-tens: set it to the reset position and then test the hour ones ***
							counter.minTens = 6;
							if (this.opts.showMinute) { this.el.minutes.find(tens).css("top", (counter.minTens * digit) + "px"); }
							
							if (counter.hourOnes == 0)
							{
								// *** now check the hours ten position
								if (counter.hourTens == 0)
								{
									counter.hourOnes = 4;
									counter.hourTens = 3;
									if (this.opts.showHour) { this.el.hours.find(tens).css("top", (counter.hourTens * digit) + "px"); }
									
									// now check the days one position
									if (counter.dayOnes == 0)
									{
										// also check the tens position and infer the next ones positon
										if (counter.dayTens == 0)
										{
											// need to go find the number of days in the next month!!!!
											var nextMonth = this.el.currentTime.month - 1,
												nextMonthYear = this.el.currentTime.year,
												thisMonthDays;
												
											if (nextMonth < 0)
											{
												nextMonth = 12;
												nextMonthYear--;											
											}
											thisMonthDays = this.daysInMonth(this.el.currentTime.month, nextMonthYear);
											
											counter.dayOnes = thisMonthDays % 10;
											counter.dayTens = Math.floor(thisMonthDays / 10) + 1;
											if (this.opts.showDay)
											{
												this.el.days.find(ones).css("top", (counter.dayOnes * digit) + "px");
												this.el.days.find(tens).css("top", (counter.dayTens * digit) + "px");
											}
											
											if (counter.monthOnes == 0)
											{
												// check to see if 1st or 11th month
												if (counter.monthTens == 0)
												{
													counter.monthOnes = 2;
													counter.monthTens = 2;
													
													// do years now
													if (counter.yearOnes == 0)
													{
														counter.yearOnes = 10;
														if (this.opts.showYear) { this.el.years.find(ones).css("top", (counter.yearOnes * digit), 600); }													
														
														if (counter.yearTens == 0)
														{
															// this is where the timer ends
															// console.log("end of timer");
															this.finish();
															return false;
														}
														else
														{
															counter.yearTens--;
															if (this.opts.showYear) { this.step(this.el.years.find(tens), (counter.yearTens * digit), 600); }
														}
													}
													
													if (this.opts.showMonth) { this.el.months.find(tens).css("top", (counter.monthTens * digit) + "px"); }
													counter.yearOnes--;
													if (this.opts.showYear) { this.step(this.el.years.find(ones), (counter.yearOnes * digit), 600); }
													
												}
												else
												{
													counter.monthOnes = 10;
												}
												
												if (this.opts.showMonth) { this.el.months.find(ones).css("top", (counter.monthOnes * digit) + "px"); }
												
												counter.monthTens--;
												if (this.opts.showMonth) { this.step(this.el.months.find(tens), (counter.monthTens * digit), 600); }
												
											}
											
											counter.monthOnes--;
											if (this.opts.showMonth) { this.step(this.el.months.find(ones), (counter.monthOnes * digit), 600); }
											
										}
										
										counter.dayTens--;
										if (this.opts.showDay) { this.step(this.el.days.find(tens), (counter.dayTens * digit), 600); }
										
									}
									else
									{
										counter.dayOnes = 10;
										if (this.opts.showDay) { this.el.days.find(ones).css("top", (counter.dayOnes * digit) + "px"); }
									}
									
									counter.dayOnes--;
									if (this.opts.showDay) { this.step(this.el.days.find(ones), (counter.dayOnes * digit), 600); }
								}
								else
								{
									counter.hourOnes = 10;
								}
									
								// *** end of the hour-ones: set it to the reset position and then test the hour-tens ***							
								if (this.opts.showHour) { this.el.hours.find(ones).css("top", (counter.hourOnes * digit) + "px"); }
								counter.hourTens--;
								if (this.opts.showHour) { this.step(this.el.hours.find(tens), (counter.hourTens * digit), 600); }
							}
							
							counter.hourOnes--;
							if (this.opts.showHour) { this.step(this.el.hours.find(ones), (counter.hourOnes * digit), 600); }
						}
						
						counter.minTens--;
						if (this.opts.showMinute) { this.step(this.el.minutes.find(tens), (counter.minTens * digit), 600); }
					}
					
					counter.minOnes--;
					if (this.opts.showMinute) { this.step(this.el.minutes.find(ones), (counter.minOnes * digit), 600); }
				}
				
				counter.secTens--;
				if (this.opts.showSecond) { this.step(this.el.seconds.find(tens), (counter.secTens * digit), 600); }
			}
							
			// get next position and the animate it
			counter.secOnes--;
			if (this.opts.showSecond) { this.step(this.el.seconds.find(ones), (counter.secOnes * digit), 300); }
			
			
			// this should definately be called at the end of the function. baby come back!
			// I may have to rip out the animations and put them at the end of the function
			if (this.el.resetStatus == true)
			{
				// console.log("reset is true, so going to start it again");
				// reset the clock after the current animation has run
				// this timeout doesn't have to be long as the animation will complete anyways
				this.start();
				return;		
			}
			else if (this.el.hasFocus == true)
			{	
				// just run the next animation
				this.el.timer = setTimeout(function(){clock.timeClock()},1000);
			}
		},
		// parse and format the end date
		parseDate : function(timeString, dateString)
		{
			// I'm going to need to add in the timezone modifier here at some point
			var timezone = this.opts.timezone,
				// get the end date of the timer
				// console.log(opts.dateFormat)	
				// split spaces, /, and - into an array
				format = this.opts.dateFormat,
				time = timeString.split(/[\s,\.\-]/),
				date = dateString.split(/[\s,\.\-\/]/),
				dateObj = {};
				
			dateObj.hours = parseInt(time[0]);
			dateObj.minutes = parseInt(time[1]);
			dateObj.seconds = parseInt(time[2]);	
				
			if (format === "dd/mm/yyyy" || format === "dd-mm-yyyy" || format === "dd mm yyyy" || format === "dd,mm,yyyy" || format === "dd.mm.yyyy")
			{
				dateObj.day = parseInt(date[0]);
				dateObj.month = parseInt(date[1]);
			}
			else if (format === "mm/dd/yyyy" || format === "mm-dd-yyyy" || format === "mm dd yyyy" || format === "mm,dd,yyyy" || format === "mm.dd.yyyy")
			{
				dateObj.day = parseInt(date[1]);
				dateObj.month = parseInt(date[0]);			
			}
			dateObj.year = parseInt(date[2]);
			//console.log(dateObj);
			
			/*
			//  ### will test for am/pm later, here is the start of the code. next I need to take out the am/pm out of the string and then
			// get the end time of the timer
			//need to find whether it is am or pm, only testing for pm so I can convert to 24hour time		
			var pmRegex = /(pm|PM)$/;		
			console.log(opts.endTime);
			if (pmRegex.test(opts.endTime))
			{
				// console.log("regex true");
				var pm = true;
			}
			else
			{
				// console.log("regex false");
				var pm = false;
			}
			// I need to take am or pm out of the string
			//  ***  here  *** //   
			if (pm == true)
			{
				// do a regex replace of pm, and then do parseInt
				dateObj.time = parseInt(opts.endTime) + 12;
			}
			else 
			{
				// do a regex replace of am, and then do parseInt
				dateObj.time = parseInt(opts.endTime);
			}
			console.log("time: "+dateObj.time);
			*/
					
			//console.log(dateObj);
			return dateObj;
		},
		// format a javascript date object into something easier to use
		getTime : function(date)
		{
			var time = {};
			time.year = date.getFullYear();
			time.month = date.getMonth() + 1;
			time.day = date.getDate();
			time.hours = date.getHours();
			time.minutes = date.getMinutes();
			time.seconds = date.getSeconds();
			//console.log(time);
			return time;
		},
		// find the time left on the clock
		findTimeDiff : function(startTime, endTime)
		{
			var timeDiff = {},
				timeCurrent = $.extend(true, {}, startTime),
				timeEnd = $.extend(true, {}, endTime);
				
			timeDiff.seconds = timeEnd.seconds - timeCurrent.seconds;
			// dont forget to carry the 1
			if (timeDiff.seconds < 0)
			{
				timeDiff.seconds += 60;
				timeEnd.minutes -= 1;
			}
			if (timeDiff.seconds > 60)
			{
				timeDiff.seconds -= 60;
				timeEnd.minutes += 1;
			}
			
			timeDiff.minutes = timeEnd.minutes - timeCurrent.minutes;
			if (timeDiff.minutes < 0)
			{
				timeDiff.minutes += 60;
				timeEnd.hours -= 1;
			}
			if (timeDiff > 60)
			{
				timeDiff.minutes -= 60;
				timeEnd.hours += 1;
			}
			
			timeDiff.hours = timeEnd.hours - timeCurrent.hours;
			if (timeDiff.hours < 0)
			{
				timeDiff.hours += 24;
				timeEnd.day -= 1;
			}
			if (timeDiff.hours > 24)
			{
				timeDiff.hours -= 24;
				timeEnd.day += 1;
			}
			
			timeDiff.day = timeEnd.day - timeCurrent.day;
			// replace with just the number of days in this month
			// 1. find how many days in this month
			// 2. subtract current date
			// need to get the month and year of the month being tested
			var daysInMonthVar = this.daysInMonth(timeCurrent.month, timeCurrent.year);
			if (timeDiff.day < 0)
			{	
				timeDiff.day +=  daysInMonthVar; // days in the current month. something like this - 
				timeEnd.month -= 1;
			}
			if (timeDiff > daysInMonthVar)
			{
				timeDiff.day -= daysInMonthVar;
				timeEnd.month += 1;
			}
			timeDiff.month = timeEnd.month - timeCurrent.month;
			
			if (timeDiff.month < 0)
			{
				timeDiff.month += 12;
				timeEnd.year -= 1;
			}
			if (timeDiff.month > 12)
			{
				timeDiff.month -= 12;
				timeEnd.year += 1;
			}
			
			timeDiff.year = timeEnd.year - timeCurrent.year;
			return timeDiff;
		},
		// add two time together to get a new time left
		correctTime : function(time, timeDiff)
		{
			//console.log("time diff:");
			//console.log(timeDiff);
			var adjustedTime = {};
			
			adjustedTime.seconds = time.seconds - timeDiff.seconds;
			if (adjustedTime.seconds < 0)
			{
				adjustedTime.seconds += 60;
				time.minutes -= 1;
			}
			if (adjustedTime.seconds > 60)
			{
				adjustedTime.seconds -= 60;
				time.minutes += 1;
			}
			
			adjustedTime.minutes = time.minutes - timeDiff.minutes;
			if (adjustedTime.minutes < 0)
			{
				adjustedTime.minutes += 60;
				time.hours -= 1;
			}
			if (adjustedTime.minutes > 60)
			{
				adjustedTime.minutes -= 60;
				time.hours += 1;
			}
			
			adjustedTime.hours = time.hours - timeDiff.hours;
			if (adjustedTime.hours < 0)
			{
				adjustedTime.hours += 23;
				adjustedTime.day -= 1;
			}
			if (adjustedTime.hours > 23)
			{
				adjustedTime.hours -= 23;
				adjustedTime.day += 1;
			}
			
			adjustedTime.day = time.day - timeDiff.day;
			var daysInMonthVar = this.daysInMonth(time.month, time.year);
			// find out how many days in this month
			// do this later
			if (adjustedTime.day < 0)
			{
				adjustedTime.day += daysInMonthVar;
				adjustedTime.month -= 1;
			}
			if (adjustedTime > daysInMonthVar)
			{
				adjustedTime.day -= daysInMonthVar;
				adjustedTime.month += 1;
			}
			
			adjustedTime.month = time.month - timeDiff.month;
			if (adjustedTime.month < 1)
			{
				adjustedTime.month += 12;
				adjustedTime.year -= 1;
			}
			if (adjustedTime.month > 12)
			{
				adjustedTime.month -= 12;
				adjustedTime.year += 1;
			}
			
			adjustedTime.year = time.year - timeDiff.year;
			
			//console.log(adjustedTime);
			return adjustedTime;
		},
		// positions the digits in the clock to the correct place
		setZeros : function(time, startTime)
		{
			// if the day is about to turn over then place the zero on the tens into position
			if (time.hours == 0)
			{
				this.el.find(".hours .tens .zero").css("top", (3 * this.opts.digitHeight) + "px");
				this.el.find(".hours .ones .zero").css("top", (4 * this.opts.digitHeight) + "px");
			}
			// this is where I need to test and position the month ones and day digits if I need to
			if (time.month == 0 && this.opts.showMonth)
			{
				this.el.find(".months .ones .zero").css("top", (2 * this.opts.digitHeight) + "px");
			}
			
			if (time.day == 0)
			{
				// find out how many days in the next month and position the day zeros
				var nextMonth = startTime.month;
				var theYear = startTime.year;
				if (nextMonth > 12)
				{
					nextMonth = 0;
					theYear += 1;
				}
				
				var monthDays = this.daysInMonth(nextMonth, theYear),
					dayOnes = (monthDays % 10),
					dayTens = Math.floor(monthDays / 10) + 1;
				
				if (this.opts.showDay)
				{
					// if the days are greater than 10 and less than daysInMonth then set the ones zero to ten
					if (monthDays > 10)
					{
						
						this.el.find(".days .ones .zero").css("top", (10 * this.opts.digitHeight) + "px");
					}
					else
					{
						this.el.find(".days .ones .zero").css("top", (dayOnes * this.opts.digitHeight) + "px");
					}
					this.el.find(".days .tens .zero").css("top", (dayTens * this.opts.digitHeight) + "px");
				}
			}
			
		},
		// get the number of days in the months
		daysInMonth : function(month, year)
		{
			return 32 - new Date(year, month, 32).getDate();
		},
		// function that animates the clock!!!!
		step : function(element, position, time)
		{
			element.stop().animate({"top" : position + "px"}, time);
		},
		// finish the timer
		finish : function()	
		{
			this.el.html(this.opts.finishedMessage);
		},
		option : function(args) {
			this.opts = $.extend(true, {}, this.opts, args);
		},
		destroy : function() {
			this.el.unbind("." + this.namespace);
		}
	};
	
	// the plugin bridging layer to allow users to call methods and add data after the plguin has been initialised
	// props to https://github.com/jsor/jcarousel/blob/master/src/jquery.jcarousel.js for the base of the code & http://isotope.metafizzy.co/ for a good implementation
	$.fn.countdown = function(options, callback) {
		// define the plugin name here so I don't have to change it anywhere else. This name refers to the jQuery data object that will store the plugin data
		var pluginName = "countdowntimer",
			args;
		
		// if the argument is a string representing a plugin method then test which one it is
		if ( typeof options === 'string' ) {
			// define the arguments that the plugin function call may make 
			args = Array.prototype.slice.call( arguments, 1 );
			// iterate over each object that the function is being called upon
			this.each(function() {
				// test the data object that the DOM element that the plugin has for the DOM element
				var pluginInstance = $.data(this, pluginName);
				
				// if there is no data for this instance of the plugin, then the plugin needs to be initialised first, so just call an error
				if (!pluginInstance) {
					alert("The plugin has not been initialised yet when you tried to call this method: " + options);
					return;
				}
				// if there is no method defined for the option being called, or it's a private function (but I may not use this) then return an error.
				if (!$.isFunction(pluginInstance[options]) || options.charAt(0) === "_") {
					alert("the plugin contains no such method: " + options);
					return;
				}
				// apply the method that has been called
				else {
					pluginInstance[options].apply(pluginInstance, args);
				}
			});
			
		}
		// initialise the function using the arguments as the plugin options
		else {
			// initialise each instance of the plugin
			this.each(function() {
				// define the data object that is going to be attached to the DOM element that the plugin is being called on
				var pluginInstance = $.data(this, pluginName);
				// if the plugin instance already exists then apply the options to it. I don't think I need to init again, but may have to on some plugins
				if (pluginInstance) {
					pluginInstance.option(options);
					// initialising the plugin here may be dangerous and stack multiple event handlers. if required then the plugin instance may have to be 'destroyed' first
					//pluginInstance.init(callback);
				}
				// initialise a new instance of the plugin
				else {
					$.data(this, pluginName, new $.Countdown(options, this, callback));
				}
			});
		}
		
		// return the jQuery object from here so that the plugin functions don't have to
		return this;
	};

	// end of module
})(jQuery);
