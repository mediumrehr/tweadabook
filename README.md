# Twead A Book
A twitter bot that tweets a book (pdf) in 140(ish) character chunks at a set rate of time. [www.twitter.com/tweadabook](http://www.twitter.com/tweadabook)

## Heroku Setup
```sh
$ heroku create --buildpack https://github.com/heroku/heroku-buildpack-multi.git --stack cedar
```
```sh
$ heroku config:set CONSUMER_KEY=xxxxx
$ heroku config:set CONSUMER_SECRET=xxxxx
$ heroku config:set ACCESS_TOKEN=xxxxx
$ heroku config:set ACCESS_TOKEN_SECRET=xxxxx
```
Be sure to set the Twitter keys as environment variables for Heroku, or replace the env var references with the keys in twead.js.

Once you've pushed the project to heroku, make sure to scale the worker dyno to 1
```sh
$ heroku ps:scale worker=1
```

## Known Problems
* Twead A Book currently prints page numbers inline with text
* cedar-10 will be depricated at the end of the year, but poppler buildpacks aren't configured for cedar-14 yet (at least I haven't found any that work with cedar-14)

## License
MIT