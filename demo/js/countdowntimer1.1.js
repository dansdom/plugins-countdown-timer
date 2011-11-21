/*
	jQuery Countdown Timer Plugin v1.0
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


(function($){

	$.fn.countdown = function(config)
	{
		// config - default settings
		var settings = {
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
							timezone : 0 // timezone adjuster						                                  
					 };

		// if settings have been defined then overwrite the default ones
        // comments:        true value makes the merge recursive. that is - 'deep' copy
		//				{} creates an empty object so that the second object doesn't overwrite the first object
		//				this emtpy takes object1, extends2 onto object1 and writes both to the empty object
		//				the new empty object is now stored in the var opts.
		var opts = $.extend(true, {}, settings, config);
		
		// iterate over each object that calls the plugin and do stuff
		this.each(function(){
			// do pluging stuff here
			// console.log(opts.endTime);
			// console.log(opts.endDate);
			
			var clock = $(this);
			clock.timer = 0;	
			clock.hasFocus = true;
			
			// make the markup for the clock
			$.fn.countdown.makeClock(clock, opts);
			
			// I should probably do my cock.seconds etc definitions here
			clock.seconds = clock.find(".seconds");
			clock.minutes = clock.find(".minutes");
			clock.hours = clock.find(".hours");
			clock.days = clock.find(".days");
			clock.months = clock.find(".months");
			clock.years = clock.find(".years");
			//console.log("setting clock position");
			// now I can hide those units that I dont want
			
			// maybe wrap up all the functions that start the clock up into one method that can be called at the end of every minute
			// every minute maybe reset the clock again. find out how much time is left, set the clock and then put the timer back on
			// only needed once so putting it on document.focus()
			$.fn.countdown.init(clock, opts);
			
			// set event handling for document blur event so that I can set up the clock again			
			$(document).focus(function(){
				clearTimeout(clock.timer);
				$.fn.countdown.init(clock, opts);
				//console.log("setting up the clock again");
				clock.hasFocus = true;
			});			
			
			$(document).blur(function(){
				//console.log("the document has blurred");
				clearTimeout(clock.timer);
				clock.hasFocus = false;
			});			

			// end of plugin stuff
		});

		// return jQuery object
		return this;
	};

	// plugin functions go here - example of two different ways to call a function, and also two ways of using the namespace
	// note: $.fn.testPlugin.styleBox allows for this function to be extended beyond the scope of the plugin and used elsewhere, 
	// that is why it is a superior namespace. Also: anonymous function calling I think is probably better naming practise too.
	
	// initialise the clock, ready for the next minutes countdown
	$.fn.countdown.init = function(clock, opts)
	{
		// console.log("countdown.init()");
		// stop any timed events
		clearTimeout(clock.timer);
		
		// get the finish date
		clock.endTime = $.fn.countdown.getEndDate(opts);
		
		// get the current time
		clock.currentTime = $.fn.countdown.getCurrentTime();
		//console.log("current time: ");
		//console.log(clock.currentTime);
		// define the reset status so I can pass it around?
		clock.resetStatus = false;
			
		// find the time that has left to run on the clock
		clock.timeLeft = $.fn.countdown.findTimeLeft(clock, opts);
			
		// set the starting position on the clock
		$.fn.countdown.setClock(clock, opts);
			
		// start the timer on the clock
		clock.timer = setTimeout(function(){$.fn.countdown.timeClock(clock, opts);},1000);
		
	};
	
	// make the markup for the clock
	$.fn.countdown.makeClock = function(clock, opts)
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
		if (opts.showYear)
		{
			clockPane += years;
		}
		if (opts.showMonth)
		{
			clockPane += months;
		}
		if (opts.showDay)
		{
			clockPane += days;
		}
		if (opts.showHour)
		{
			clockPane += hours;			
		}
		if (opts.showMinute)
		{
			clockPane += minutes;
		}
		if (opts.showSecond)
		{
			clockPane += seconds;
		}
		clockPane += '</div>';
			
		clock.html(clockPane);
		$(".clock > div").css({"float":"left", "position":"relative"});
		$(".zero").css({"height":opts.digitHeight+"px", "width":opts.digitWidth+"px", "padding":"0px", "margin":"0px", "z-index":"2", "position":"absolute", "top":"0px", "left":"0px"});
		$(".tens, .ones").css({"float":"left","position":"relative", "display":"block", "height":opts.digitHeight+"px", "width":opts.digitWidth+"px", "overflow":"hidden", "padding":"0px", "margin":"0px"});
		$(".digitWrap").css("position","relative");
		$(".tens .digits, .ones .digits").css({"position":"absolute","top":"0px","left":"0px","width":opts.digitWidth+"px", "z-index":"1"});
		$(".tens li, .ones li").css({"display":"block", "height":opts.digitHeight+"px", "width":opts.digitWidth+"px", "list-style":"none", "padding":"0px", "margin":"0px"});
		// this line excludes the month number which will be set later
		$(".ones .zero").css("top",(10*opts.digitHeight) + "px");
		$(".seconds .tens .zero, .minutes .tens .zero").css("top",(6*opts.digitHeight) + "px");
		$(".hours .tens .zero").css("top", (3*opts.digitHeight) + "px");		
		$(".months .tens .zero").css("top", (2*opts.digitHeight) + "px");
		$(".years .tens .zero").css("top", (10*opts.digitHeight) + "px");
	
	};
	
	// set the position of the clock
	$.fn.countdown.setClock = function(clock, opts)
	{
		//console.log("countdown.setClock");
		var clockTime = clock.timeLeft,
			digit = -opts.digitHeight,
			tens = ".tens .digits",
			ones = ".ones .digits",
			counter = {};
			
		// console.log(clockTime);
		// find the digits
		counter.secOnes = clockTime.seconds%10;
		counter.secTens = Math.floor(clockTime.seconds/10);
		counter.minOnes = clockTime.minutes%10;
		counter.minTens = Math.floor(clockTime.minutes/10);
		counter.hourOnes = clockTime.hours%10;
		counter.hourTens = Math.floor(clockTime.hours/10);
		counter.dayOnes = clockTime.day%10;
		counter.dayTens = Math.floor(clockTime.day/10);
		counter.monthOnes = clockTime.month%10;
		counter.monthTens = Math.floor(clockTime.month/10);
		counter.yearOnes = clockTime.year%10;
		counter.yearTens = Math.floor(clockTime.year/10);
		
		// console.log("setting the clock hands position");
		if (opts.showSecond)
		{
			clock.seconds.find(ones).css("top",(counter.secOnes * digit) + "px");
			clock.seconds.find(tens).css("top",(counter.secTens * digit) + "px");
		}
		if (opts.showMinute)
		{
			clock.minutes.find(ones).css("top",(counter.minOnes * digit) + "px");
			clock.minutes.find(tens).css("top",(counter.minTens * digit) + "px");		
		}
		if (opts.showHour)
		{
			clock.hours.find(ones).css("top",(counter.hourOnes * digit) + "px");
			clock.hours.find(tens).css("top",(counter.hourTens * digit) + "px");		
		}
		if (opts.showDay)
		{
			clock.days.find(ones).css("top",(counter.dayOnes * digit) + "px");
			clock.days.find(tens).css("top",(counter.dayTens * digit) + "px");
		}
		if (opts.showMonth)
		{
			clock.months.find(ones).css("top",(counter.monthOnes * digit) + "px");
			clock.months.find(tens).css("top",(counter.monthTens * digit) + "px");		
		}
		if (opts.showYear)
		{
			clock.years.find(ones).css("top",(counter.yearOnes * digit) + "px");	
			clock.years.find(tens).css("top",(counter.yearTens * digit) + "px");
		}
		
		clock.count = counter;	
	};
	
	// clock timer function
	$.fn.countdown.timeClock = function(clock, opts)
	{
		//console.log("countdown.timeClock");
		var resetPos = 10,
			digit = -opts.digitHeight,
			counter = clock.count,
			secOnesPos = clock.count.secOnes,
			nextSecOnesPos,
			ones = ".ones .digits",	// for good code optimisation
			tens = ".tens .digits"; // for goot code optimisation			
														
		// need to optimise the selectors here with the digit objects I have just defined
		
		if (counter.secOnes == 0)
		{	
			// *** end of second-ones: set it to the reset position and then test second-tens ***
			counter.secOnes = 10;
			if (opts.showSecond) { clock.seconds.find(ones).css("top",(counter.secOnes * digit) + "px"); }
			
			if (counter.secTens == 0)
			{
				// flick on the rest flag
				clock.resetStatus = true;
				//console.log("reset status is true");
					
				// *** end of the second-tens: set it to the reset position and then test the minute-ones ***
				counter.secTens = 6;
				if (opts.showSecond) { clock.seconds.find(tens).css("top",(counter.secTens * digit) + "px"); }
				
				if (counter.minOnes == 0)
				{					
					// *** end of the minute-ones: set it to the reset position and then test the minute-tens ***
					counter.minOnes = 10;
					if (opts.showMinute) { clock.minutes.find(ones).css("top",(counter.minOnes * digit) + "px"); }
					
					if (counter.minTens == 0)
					{
						// *** end of the minute-tens: set it to the reset position and then test the hour ones ***
						counter.minTens = 6;
						if (opts.showMinute) { clock.minutes.find(tens).css("top",(counter.minTens * digit) + "px"); }
						
						if (counter.hourOnes == 0)
						{
							// *** now check the hours ten position
							if (counter.hourTens == 0)
							{
								counter.hourOnes = 4;
								counter.hourTens = 3;
								if (opts.showHour) { clock.hours.find(tens).css("top",(counter.hourTens * digit) + "px"); }
								
								// now check the days one position
								if (counter.dayOnes == 0)
								{
									// also check the tens position and infer the next ones positon
									if (counter.dayTens == 0)
									{
										// need to go find the number of days in the next month!!!!
										var nextMonth = clock.currentTime.month - 1;
										var nextMonthYear = clock.currentTime.year;
										if (nextMonth < 0)
										{
											nextMonth = 12;
											nextMonthYear--;											
										}
										var nextMonthDays = $.fn.countdown.daysInMonth(nextMonth,nextMonthYear);								
										counter.dayOnes = nextMonthDays%10;
										counter.dayTens = Math.floor(nextMonthDays/10) + 1;
										if (opts.showDay)
										{
											clock.days.find(ones).css("top",(counter.dayOnes * digit) + "px");
											clock.days.find(tens).css("top",(counter.dayTens * digit) + "px");
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
													if (opts.showYear) { clock.years.find(ones).css("top",(counter.yearOnes * digit), 600); }													
													
													if (counter.yearTens == 0)
													{
														// this is where the timer ends
														// console.log("end of timer");
														$.fn.countdown.finish(clock, opts);
														return false;
													}
													else
													{
														counter.yearTens--;
														if (opts.showYear) { $.fn.countdown.step(clock.years.find(tens), (counter.yearTens * digit), 600); }
													}
												}
												
												if (opts.showMonth) { clock.months.find(tens).css("top",(counter.monthTens * digit) + "px"); }
												counter.yearOnes--;
												if (opts.showYear) { $.fn.countdown.step(clock.years.find(ones), (counter.yearOnes * digit), 600); }
												
											}
											else
											{
												counter.monthOnes = 10;
											}
											
											if (opts.showMonth) { clock.months.find(ones).css("top",(counter.monthOnes * digit) + "px"); }
											
											counter.monthTens--;
											if (opts.showMonth) { $.fn.countdown.step(clock.months.find(tens), (counter.monthTens * digit), 600); }
											
										}
										
										counter.monthOnes--;
										if (opts.showMonth) { $.fn.countdown.step(clock.months.find(ones), (counter.monthOnes * digit), 600); }
										
									}
									
									counter.dayTens--;
									if (opts.showDay) { $.fn.countdown.step(clock.days.find(tens), (counter.dayTens * digit), 600); }
								}
								else
								{
									counter.dayOnes = 10;
								}
								
								counter.dayOnes--;
								if (opts.showDay) { $.fn.countdown.step(clock.days.find(ones), (counter.dayOnes * digit), 600); }
							}
							else
							{
								counter.hourOnes = 10;
							}
								
							// *** end of the hour-ones: set it to the reset position and then test the hour-tens ***							
							if (opts.showHour) { clock.hours.find(ones).css("top",(counter.hourOnes * digit) + "px"); }
							counter.hourTens--;
							if (opts.showHour) { $.fn.countdown.step(clock.hours.find(tens), (counter.hourTens * digit), 600); }
						}
						
						counter.hourOnes--;
						if (opts.showHour) { $.fn.countdown.step(clock.hours.find(ones), (counter.hourOnes * digit), 600); }
					}
					
					counter.minTens--;
					if (opts.showMinute) { $.fn.countdown.step(clock.minutes.find(tens), (counter.minTens * digit), 600); }
				}
				
				counter.minOnes--;
				if (opts.showMinute) { $.fn.countdown.step(clock.minutes.find(ones), (counter.minOnes * digit), 600); }
			}
			
			counter.secTens--;
			if (opts.showSecond) { $.fn.countdown.step(clock.seconds.find(tens), (counter.secTens * digit), 600); }
		}
						
		// get next position and the animate it
		counter.secOnes--;
		if (opts.showSecond) { $.fn.countdown.step(clock.seconds.find(ones), (counter.secOnes * digit), 300); }
		
		
		// this should definately be called at the end of the function. baby come back!
		// I may have to rip out the animations and put them at the end of the function
		if (clock.resetStatus == true)
		{
			// console.log("reset is true, so going to start it again");
			// reset the clock after the current animation has run
			// this timeout doesn't have to be long as the animation will complete anyways
			$.fn.countdown.init(clock, opts);
			return;		
		}
		else if (clock.hasFocus == true)
		{	
			// just run the next animation	
			clock.timer = setTimeout(function(){$.fn.countdown.timeClock(clock, opts)},1000);
		}
	};

	// parse and format the end date
	$.fn.countdown.getEndDate = function(opts)
	{
		// console.log("countdown.getEndDate");
		// I'm going to need to add in the timezone modifier here at some point
		var timezone = opts.timezone;
	
		// get the end date of the timer
		// console.log(opts.dateFormat)	
		// split spaces, /, and - into an array
		var format = opts.dateFormat,
			finishDate = opts.endDate.split(/[\s,\.\-\/]/),
			finishTime = opts.endTime.split(/[\s,\.\-]/),
			dateObj = {};
			
		if (format === "dd/mm/yyyy" || format === "dd-mm-yyyy" || format === "dd mm yyyy" || format === "dd,mm,yyyy" || format === "dd.mm.yyyy")
		{
			dateObj.day = parseInt(finishDate[0]);
			dateObj.month = parseInt(finishDate[1]);
		}
		else if (format === "mm/dd/yyyy" || format === "mm-dd-yyyy" || format === "mm dd yyyy" || format === "mm,dd,yyyy" || format === "mm.dd.yyyy")
		{
			dateObj.day = parseInt(finishDate[1]);
			dateObj.month = parseInt(finishDate[0]);			
		}
		dateObj.year = parseInt(finishDate[2]);
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
				
		dateObj.hours = parseInt(finishTime[0]);
		dateObj.minutes = parseInt(finishTime[1]);
		dateObj.seconds = parseInt(finishTime[2]);
		//console.log(dateObj);
		return dateObj;
	};
	
	// get the current time and format it
	$.fn.countdown.getCurrentTime = function()
	{
		// console.log("countdown.getCurrentTime");
		var time = {},
			currentTime = new Date();
			
		time.year = currentTime.getFullYear();
		time.month = currentTime.getMonth();
		time.day = currentTime.getDate();
		time.hours = currentTime.getHours();
		time.minutes = currentTime.getMinutes();
		time.seconds = currentTime.getSeconds();
		
		// this is the current time of the browser, not Greenwich meantime so beware!!!	
		//console.log(time);
		return time;
	};
	
	$.fn.countdown.findTimeLeft = function(clock, opts)
	{
		// console.log("countdown.findTimeLeft");
		var timeToGo = {},
			timeCurrent = clock.currentTime,
			timeEnd = clock.endTime;
		
		timeToGo.seconds = timeEnd.seconds - timeCurrent.seconds;
		// dont forget to carry the 1
		if (timeToGo.seconds < 0)
		{
			timeToGo.seconds += 60;
			timeEnd.minutes--;
		}
		timeToGo.minutes = timeEnd.minutes - timeCurrent.minutes;
		if (timeToGo.minutes < 0)
		{
			timeToGo.minutes += 60;
			timeEnd.hours--;
		}
		timeToGo.hours = timeEnd.hours - timeCurrent.hours;
		if (timeToGo.hours < 0)
		{
			timeToGo.hours += 24;
			timeEnd.day--;
		}
		
		timeToGo.day = timeEnd.day - timeCurrent.day;
		// replace with just the number of days in this month
		// 1. find how many days in this month
		// 2. subtract current date
		
		
		if (timeToGo.day < 0)
		{
			// need to get the month and year of the month being tested
			// console.log("curent year: "+timeCurrent.year+", current month: "+timeCurrent.month);
			var daysInMonthVar = $.fn.countdown.daysInMonth(timeCurrent.month, timeCurrent.year);
			// console.log("days in month: "+daysInMonthVar);
			timeToGo.day +=  daysInMonthVar; // days in the current month. something like this - 
			timeEnd.month--;
		}
		timeToGo.month = timeEnd.month - timeCurrent.month;
		if (timeToGo.month < 0)
		{
			timeToGo.month += 12;
			timeEnd.year--;
		}
		timeToGo.year = timeEnd.year - timeCurrent.year;
		//console.log(timeCurrent);
		//console.log(timer.endTime);
		// console.log("time left: days: "+timeToGo.day+", months: "+timeToGo.month+", years: "+timeToGo.year+", hours: "+timeToGo.hours+", minutes: "+timeToGo.minutes+", seconds: "+timeToGo.seconds);
		
		// this is where I need to test and position the month ones and day digits if I need to
		if (timeToGo.month == 0 && opts.showMonth)
		{
			$(".months .ones .zero").css("top", (2*opts.digitHeight) + "px");
		}
		if (timeToGo.day == 0)
		{
			// find out how many days in the next month and position the day zeros
			nextMonth = timeCurrent.month + 1;
			theYear = timeCurrent.year;
			if (nextMonth > 12)
			{
				nextMonth = 0;
				theYear += 1;
			}
			
			var nextMonthDays = $.fn.countdown.daysInMonth(nextMonth, theYear);
			//console.log(nextMonthDays);
			var dayOnes = nextMonthDays%10 + 1,
				dayTens = Math.floor(nextMonthDays/10) + 1;
			//console.log("one: "+dayOnes+", tens: "+dayTens);
			
			if (opts.showDay)
			{
				$(".days .ones .zero").css("top", (dayOnes*opts.digitHeight) + "px");
				$(".days .tens .zero").css("top", (dayTens*opts.digitHeight) + "px");
			}
		}
		return timeToGo;
		
	};
	
	// get the number of days in the months
	$.fn.countdown.daysInMonth = function(month, year)
	{
		return 32 - new Date(year, month, 32).getDate();
	};
	
	// function that animates the clock!!!!
	$.fn.countdown.step = function(element, position, time)
	{
		element.animate({"top":position+"px"}, time);
	};	
	
	// finish the timer
	$.fn.countdown.finish = function(clock, opts)	
	{
		clock.html(opts.finishedMessage);
	};

	// end of module
})(jQuery);