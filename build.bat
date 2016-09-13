java -jar cc.jar -O SIMPLE --js aqmh.js --js_output_file aqmh.min.js --language_out ECMASCRIPT5 --charset UTF-8
copy /b jquery.min.js+aqmh.min.js www\js\aqmh.min.js
del /f /q aqmh.min.js
cleancss -o www/css/aqmh.min.css aqmh.css
