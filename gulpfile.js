const codecov = require('gulp-codecov')
const gulp = require('gulp')

gulp.task('default', function() {
    // place code for your default task here
})

gulp.src('./coverage/lcov.info').pipe(codecov())
