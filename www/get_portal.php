<?php

echo get_url("http://ingressmm.com/get_portal.php?".$_SERVER['QUERY_STRING']);

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