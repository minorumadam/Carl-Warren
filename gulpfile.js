var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');

////////////////////
// build
////////////////////
gulp.task('build', ['compile-stylus', 'compile-sass', 'jshint']);

////////////////////
// default
////////////////////
gulp.task('default', $.taskListing.withFilters(null, 'default'));

////////////////////
// compile-sass
////////////////////
gulp.task('compile-sass', function() {
  return gulp.src(__dirname + '/scss/**/*.scss')
    .pipe(plumber())
    .pipe($.sass())
    .pipe($.autoprefixer('> 1%', 'last 2 version', 'ff 12', 'ie 8', 'opera 12', 'chrome 12', 'safari 12', 'android 2'))
    .pipe(gulp.dest(__dirname + '/www/css/'))
    .pipe(browserSync.reload({stream:true}));
});

////////////////////
// compile-stylus
////////////////////
gulp.task('compile-stylus', function() {
  return gulp.src([__dirname + '/stylus/*-theme.styl'])
    .pipe(plumber())
    .pipe($.stylus({errors: true, define: {mylighten: mylighten}}))
    .pipe($.autoprefixer('> 1%', 'last 2 version', 'ff 12', 'ie 8', 'opera 12', 'chrome 12', 'safari 12', 'android 2'))
    .pipe($.rename(function(path) {
      path.dirname = '.';
      path.basename = 'components-' + path.basename;
      path.ext = 'css';
    }))
    .pipe(gulp.dest(__dirname + '/www/lib/onsen/css/'))
    .pipe(browserSync.reload({stream:true}));

  // needs for compile
  function mylighten(param) {
    if (param.rgba) {
      var result = param.clone();
      result.rgba.a = 0.2;
      return result;
    }
    throw new Error('mylighten() first argument must be color.');
  }
});

////////////////////
// jshint
////////////////////
gulp.task('jshint', function() {
  return gulp.src([__dirname + '/www/*.js', __dirname + '/www/js/**/*.js'])
    .pipe(plumber())
    .pipe($.cached('jshint'))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
});

////////////////////
// serve
////////////////////
gulp.task('serve', ['build', 'browser-sync'], function() {
  gulp.watch(
    [__dirname + '/scss/**/*.scss'],
    {debounceDelay: 1000},
    ['compile-sass']
  );
    gulp.watch(
    [__dirname + '/stylus/**/*.styl'],
    {debounceDelay: 1000},
    ['compile-stylus']
  );

  gulp.watch(
    [__dirname + '/www/*.js', __dirname + '/www/js/**/*.js'],
    {debounceDelay: 1000},
    ['jshint']
  );

});

////////////////////
// browser-sync
////////////////////
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: __dirname + '/www/',
      directory: true
    },
    ghostMode: false,
    notify: false,
    debounce: 1000,
    port: 8901,
    startPath: 'index.html'
  });

  gulp.watch([
    __dirname + '/www/**/*.{js,html,svg,png,gif,jpg,jpeg}'
  ], {
    debounceDelay: 1000
  }, function() {
    browserSync.reload();
  });
});

////////////////////
// cordova
////////////////////
gulp.task('cordova', function() {
  return gulp.src('')
    .pipe(plumber())
    .pipe($.shell([
      'cordova prepare',
      //'cp -Rf www platforms/ios/',
      //'cp -Rf www platforms/android/assets/',
      'adb uninstall com.blakeis.claimmartphoto'
      ], {cwd: __dirname})
    );
});

// utils
function plumber() {
  return $.plumber({errorHandler: $.notify.onError()});
}
