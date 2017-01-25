const gulp = require("gulp")
const babel = require("gulp-babel")

gulp.task("default", function () {
  return gulp.src("jelpp-wei-client.js")
    .pipe(babel())
    .pipe(gulp.dest("dist"))
})