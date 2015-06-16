/***************************************

Project: Twead A Book (get it?! ...tweet + read = twead!)
Description: A twitter bot that tweets a book (pdf) in 140(ish)
  character chunks at a set interval of time.
  www.twitter.com/tweadabook
Author: Rob Rehr / www.robrehrig.com
Last edited: June 15, 2015

***************************************/

// Uses twit, node-persist, and pdftotextjs npm modules
var Twit = require('twit');
var pdftotext = require('pdftotextjs'),
          pdf = new pdftotext('Lorem_ipsum.pdf');

// Get PDF text and clean it up
var pdfText = pdf.getTextSync();
pdfText = pdfText.replace(/[\n\r]+/g, ' '); // replace carriage returns with a space
pdfText = pdfText.replace(/\t/g, ''); 		// remove tabs
pdfText = pdfText.replace(/\u2022/g, ''); 	// remove any bullets
pdfText = pdfText.replace(/\s{2,}/g, ' '); 	// replace double spaces with a single space

var currCharLoc = 0;
var pdfLength = pdfText.length; 			// Length of PDF text
var totalTweets = Math.ceil(pdfLength/135);	// Estimate number of tweets total by guessing the average tweet is 135 characters
var tweetIntervalTime = 60; 				// Set time between tweets in minutes (currently 60 min)
var totalDays = Math.round(totalTweets*tweetIntervalTime/60/24*100)/100; // Estimate number of days it'll take to finish

/* Make sure to set your environment variables before running,
   or replace the process.env.*'s with the appropriate keys.
   You can generate a set of twitter api keys at 
   https://apps.twitter.com/app/new
   
   To set heroku env vars with toolkit, type the following in
   terminal in your heroku directory
   
     heroku config:set CONSUMER_KEY=xxxxx
   
   Substitute your actual consumer key in place of xxxxx, and
   do this for the other keys as well.
*/
var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY
  , consumer_secret:      process.env.CONSUMER_SECRET
  , access_token:         process.env.ACCESS_TOKEN
  , access_token_secret:  process.env.ACCESS_TOKEN_SECRET
})

T.get('statuses/user_timeline', {screen_name: 'tweadabook', count:1}, function (err, data, response) {
	var updateLoc = pdfText.indexOf(data[0].text);
	console.log("location: " + updateLoc);
	if (updateLoc > 0) {
		var currCharLoc = updateLoc + data[0].text.length;
		tweetBook(currCharLoc);
	} else
		startBook();
})

// Post name of PDF and time it'll take to tweet
// Only tweet this info if we're at the beginning of the pdf
function startBook() {
	var currCharLoc = 0;
	var pdfName = pdf.options.additional[0];
	var titleTweet  = pdfName + ' tweeted over the span of ~' + totalDays + ' days.';
	T.post('statuses/update', { status: titleTweet}, function(err, data, response) {
	  console.log(data)
	});
	currCharLoc = 0;
	tweetBook(0);
}

// Grab the next section of words to tweet
function get140Chars(charLoc) {
	// Check if we have 140 or more characters to tweet
	if ((pdfLength - charLoc) >= 140) {
		var currChars = pdfText.substr(charLoc, 140);
		var currLength = 140;
		
		// Make sure we don't start a new chapter mid tweet
		var chapterLoc = currChars.search("Chapter");
		if (chapterLoc > 1)
			currChars = currChars.substr(0, chapterLoc);
		else {
			// Check to make sure we don't end a tweet mid-word
			if (pdfText.charAt(charLoc + 140) != ' ') {
				while(currChars.charAt(currLength-1) != ' ') {
					currLength--;
					// only exception is if the word is longer than 140 characters
					if (currLength == 0) {
						currLength = 140;
						break;
					}
				}
				// string of characters to return
				currChars = currChars.substr(0, currLength);
			}
		}
	} else
		// We're at the end of the PDF, so just grab what's left
		var currChars = pdfText.substr(charLoc, (pdfLength - charLoc));
	
	// return string to tweet
	return currChars;
}

// tweet a string of characters, strToTweet
function tweet140Chars(strToTweet) {
	T.post('statuses/update', { status: strToTweet}, function(err, data, response) {
	  console.log(data)
	});
}

function tweetBook(currCharLoc) {
	var tweetInterval = setInterval(function() {
	  try {
	  	// if starting on a space, increment to the next character
		if (pdfText.charAt(currCharLoc) == ' ')
			currCharLoc++;
		
		// grab the next group of words that'll fit in 140 characters and then tweet them
		var strToTweet = get140Chars(currCharLoc);
		tweet140Chars(strToTweet);
		
		// Calculate our new location in the pdf text and store it in case we go down
		currCharLoc = currCharLoc + strToTweet.length;
		
		// Stop tweeting when we reach the end of the PDF
		if (currCharLoc == pdfLength)
			clearInterval(tweetInterval);
	  }
	 catch (e) {
		console.log(e);
	  }
	},tweetIntervalTime*60000); // Tweet every x minutes
}
