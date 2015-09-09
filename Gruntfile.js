module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    meta: {
      banner: '/*\n' +
        ' * <%= pkg.name[0].toUpperCase() + pkg.name.slice(1) %> - v<%= pkg.version %>\n' +
        ' * <%= pkg.description %>\n' +
        ' * <%= pkg.homepage %>\n' +
        ' *\n' +
        ' * Made by <%= pkg.author.name %>\n' +
        ' * Under <%= pkg.license %> License\n' +
        ' */\n\n'
    },

    autoprefixer: {
      dist: {
        src: 'dist/**/*.css'
      },
      options: {
        browsers: ['> 0.1%'],
        cascade: false
      }
    },

    concat: {
      dist: {
        files: {
          'dist/modalize.js': 'src/modalize.js',
          'dist/modalize.css': 'src/modalize.css',
        },
        options: {
          banner: '<%= meta.banner %>'
        }
      }
    },

    csscomb: {
      all: {
        files: {
          'src/modalize.css': 'src/modalize.css',
          'dist/modalize.css': 'dist/modalize.css',
        }
      }
    },

    sass: {
      dist: {
        files: {
          'src/modalize.css' : 'src/modalize.sass'
        }
      }
    },

    uglify: {
      modalize: {
        files: {
          'dist/modalize.min.js': 'src/modalize.js',
        },
        options: {
          banner: '<%= meta.banner %>'
        }
      }
    },

    watch: {
      src: {
        files: ['src/**/*'],
        tasks: ['build']
      },
      options: {
        spawn: false
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-csscomb');

  grunt.registerTask('build',['sass', 'concat', 'autoprefixer', 'csscomb', 'uglify']);
  grunt.registerTask('default',['watch']);
}
