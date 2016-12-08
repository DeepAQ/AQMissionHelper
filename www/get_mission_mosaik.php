<?php

$kw = @$_GET['find'];
if (empty($kw)) {
    exit("Param error");
}

$search = get_url('https://ingressmosaik.com/search?f=' . urlencode($kw));
//echo $search;

$result = [];

// process mosaics
if (preg_match_all('/mosaic\/(\d+)"/', $search, $a)) {
    foreach ($a[1] as $mosaic_id) {
        $mosaic = get_url('https://ingressmosaik.com/mosaic/' . $mosaic_id);
        if (preg_match('/var lang_txt_M = (.+);.*function infoHide/s', $mosaic, $b)) {
            $result[] = str_replace("'", '"', $b[1]);
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
    if (substr($url, 0, 5) == 'https') {
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    }
    $s = curl_exec($ch);
    curl_close($ch);
    return $s;
}