<?php
$months = range(1,12);
/*
foreach($months as $month) {
    $fields = [
        "ocean" => "http://www.ncdc.noaa.gov/cag/time-series/global/globe/ocean/1/$month/1880-2016.csv",
        "land" => "http://www.ncdc.noaa.gov/cag/time-series/global/globe/land/1/$month/1880-2016.csv",
        "ocean_land" => "http://www.ncdc.noaa.gov/cag/time-series/global/globe/land_ocean/1/$month/1880-2016"
    ];

    foreach($fields as $type => $link) {
        $ch = curl_init($link);
        $fp = fopen("world/$type/$month.csv", "wb");

        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_HEADER, 0);

        curl_exec($ch);
        curl_close($ch);
        fclose($fp);
    }

    echo $month . " processed\n";
} */

// http://www.ncdc.noaa.gov/monitoring-references/faq/anomalies.php
$temps = [
    "land" => [
        "01" => 2.8,
        "02" => 3.2 ,
        "03" => 5.0 ,
        "04" => 8.1,
        "05" => 11.1,
        "06" => 13.3,
        "07" => 14.3,
        "08" => 13.8 ,
        "09" => 12.0,
        "10" => 9.3,
        "11" => 5.9,
        "12" => 3.7
    ],
    "ocean" => [
        "01" => 15.8,
        "02" => 15.9,
        "03" => 15.9,
        "04" => 16.0,
        "05" => 16.3,
        "06" => 16.4,
        "07" => 16.4,
        "08" => 16.4,
        "09" => 16.2,
        "10" => 15.9,
        "11" => 15.8,
        "12" =>15.7
    ],
    "ocean_land" => [
        "01" => 12.0,
        "02" => 12.1,
        "03" => 12.7,
        "04" => 13.7,
        "05" => 14.8,
        "06" => 15.5,
        "07" => 15.8,
        "08" => 15.6,
        "09" => 15.0,
        "10" => 14.0,
        "11" => 12.9,
        "12" => 12.2
    ]
];

$path = "world/data";
$files = scandir($path);

$fh = fopen("world/world_all.csv", "wb");
fputcsv($fh, ["year", "anomaly", "historic_avg", "actual_avg", "type", "month"]);


foreach($files as $file) {
    $types = preg_split("/_/", $file);

    if($types[1] == "land") {
        $type = $types[0] . "_" . $types[1];
    } else {
        $type = $types[0];
    }

    if (($handle = fopen("$path/$file", "r")) !== FALSE) {
        while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if(preg_match("/^[0-9]/", $data[0])) {
                $year = substr($data[0], 0, 4);
                $month = substr($data[0], -2);
                $historic_avg = $temps[$type][$month];
                $actual_avg = $historic_avg + $data[1];

                $data[0] = $year;
                $data[2] = $historic_avg;
                $data[3] = $actual_avg;
                $data[4] = $type;
                $data[5] = $month;
                fputcsv($fh, $data);
            }
        }
        fclose($handle);
    }
}

fclose($fh);