/***************************************

Project: Twead A Book (get it?! ...tweet + read = twead!)
Description: A twitter bot that tweets a book (pdf) in 140(ish)
  character chunks at a set interval of time.
  www.twitter.com/tweadabook
Author: Rob Rehr / www.robrehrig.com
Last edited: June 4, 2015

***************************************/

// Uses twit, node-persist, and pdftotextjs npm modules
var Twit = require('twit');
var bookmark = require('node-persist');
var pdftotext = require('pdftotextjs'),
          pdf = new pdftotext('Lorem_ipsum.pdf');

// Get PDF text and clean it up
var pdfData = pdf.getTextSync();
pdfData = pdfData.replace(/[\n\r]+/g, ' '); // replace carriage returns with a space
pdfData = pdfData.replace(/\t/g, ''); 		// remove tabs
pdfData = pdfData.replace(/\u2022/g, ''); 	// remove any bullets
pdfData = pdfData.replace(/\s{2,}/g, ' '); 	// replace double spaces with a single space

var pdfLength = pdfData.length; 			// Length of PDF text
var totalTweets = Math.ceil(pdfLength/135);	// Estimate number of tweets total by guessing the average tweet is 135 characters
var tweetInterval = 60; 					// Set time between tweets in minutes (currently 60 min)
var totalDays = Math.round(totalTweets*tweetInterval/60/24*100)/100; // Estimate number of days it'll take to finish

bookmark.initSync();
// Figure out location in PDF text
var currCharLoc = bookmark.getItem('location'); // Recovered location in case server goes down
if ((currCharLoc < 1) || (currCharLoc === undefined)) currCharLoc = 0;

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

// Post name of PDF and time it'll take to tweet
// Only tweet this info if we're at the beginning of the pdf
if (currCharLoc == 0) {
	var pdfName = pdf.options.additional[0];
	var titleTweet  = pdfName + ' tweeted over the span of ~' + totalDays + ' days.';
	T.post('statuses/update', { status: titleTweet}, function(err, data, response) {
	  console.log(data)
	});
// 	console.log(titleTweet);
}

// Grab the next section of words to tweet
function get140Chars(charLoc) {
	// if starting on a space, increment to the next character
	if (pdfData.charAt(charLoc) == ' ')
		charLoc++;
	
	// Check if we have 140 or more characters to tweet
	if ((pdfLength - charLoc) >= 140) {
		var currChars = pdfData.substr(charLoc, 140);
		var currLength = 140;
		
		// Make sure we don't start a new chapter mid tweet
		var chapterLoc = currChars.search("Chapter");
		if (chapterLoc > 1) {
			currChars = currChars.substr(0, chapterLoc);
			currLength = chapterLoc;
		} 
	
		else {
			// Check to make sure we don't end a tweet on a partial word
			if (pdfData.charAt(charLoc + 140) != ' ') {
				while(currChars.charAt(currLength-1) != ' ') {
					currLength--;
					if (currLength == 0) {
						currLength = 140;
						break;
					}
				}
				currChars = currChars.substr(0, currLength);
			}
		}
		T.post('statuses/update', { status: currChars}, function(err, data, response) {
		  console.log(data)
		});
// 		console.log(currChars);

		// Calculate our new location in the pdf text and store it in case we go down
		currCharLoc = charLoc + currLength;
		bookmark.setItem('location',currCharLoc);
	} else {
		// We're at the end of the PDF
		var currChars = pdfData.substr(charLoc, (pdfLength - charLoc));
		T.post('statuses/update', { status: currChars}, function(err, data, response) {
		  console.log(data)
		});
// 		console.log(currChars);

		currCharLoc = pdfLength;
		// Set the stored location to zero for the next book
		bookmark.setItem('location',0);
	}
}

var tweetInterval = setInterval(function() {
  try {
    get140Chars(currCharLoc);
    // Stop tweeting when we reach the end of the PDF
    if (currCharLoc == pdfLength)
    	clearInterval(tweetInterval);
  }
 catch (e) {
    console.log(e);
  }
},tweetInterval*60000); // Tweet every x minutes
