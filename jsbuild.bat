java -jar cc.jar -O SIMPLE --js index.js --js_output_file index.min.js --language_out ECMASCRIPT5 --charset UTF-8
copy /b jquery.min.js+index.min.js www\js\aqmh.min.js
del /f /q index.min.js
