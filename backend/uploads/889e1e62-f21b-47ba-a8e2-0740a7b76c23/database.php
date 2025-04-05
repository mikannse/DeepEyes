<?php

    $str = 'P3LMJ4uCbkFJ/RarywrCvA==';
    $str = str_replace(array("/r/n", "/r", "/n"), "", $str);
    $key = 'PanGuShi';
    $iv = substr(sha1($key),0,16);
    $td = mcrypt_module_open(MCRYPT_RIJNDAEL_128,"",MCRYPT_MODE_CBC,"");
    mcrypt_generic_init($td, "PanGuShi", $iv);
    $decode = base64_decode($str);
    $dencrypted = mdecrypt_generic($td, $decode);
    mcrypt_generic_deinit($td);
    mcrypt_module_close($td);
    $dencrypted = trim($dencrypted);
    echo $dencrypted;

?>