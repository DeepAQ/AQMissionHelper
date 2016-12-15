<?php

$kw = @$_GET['find'];
if (empty($kw)) {
    exit("Param error");
}

$search = @file_get_contents('https://ingressmosaik.com/search?f=' . urlencode($kw));
//echo $search;

$result = [];

// process mosaics
if (preg_match_all('/mosaic\/(\d+)"/', $search, $a)) {
    $count = 0;
    foreach ($a[1] as $mosaic_id) {
        $count++;
        if ($count > 2) {
            break;
        }
        $mosaic = @file_get_contents('https://ingressmosaik.com/mosaic/' . $mosaic_id);
        if (preg_match('/\{"id":(.+);.*function infoHide/s', $mosaic, $b)) {
            $result[] = '[0,0,0,{"id":' . $b[1]; //str_replace("'", '"', $b[1]);
        }
    }
}

echo json_encode($result);

function get_url($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $s = curl_exec($ch);
    curl_close($ch);
    return $s;
}