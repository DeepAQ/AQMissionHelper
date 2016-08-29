java -jar cc.jar -O SIMPLE --js index.js --js_output_file index.min.js
copy /b jquery.min.js+index.min.js aqmh.min.js
del /f /q index.min.js
