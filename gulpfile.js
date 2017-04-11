const gulp = require('gulp');

// Load plugins
const $ = require('gulp-load-plugins')();

/* es6 */
gulp.task('logger', function() {
  return gulp.src('logger/*.js')
    .pipe($.babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('dist/logger/'));
});
