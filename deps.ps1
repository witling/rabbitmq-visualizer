$include_dir = "include"
$dependencies = New-Object System.Collections.Generic.List[string]

Function Load-File ($url) {
    $filename = Split-Path $url -leaf
    $path = "$($include_dir)/$($filename)"
    Write-Host "Loading file from $($url), path: $($path)"
    Invoke-WebRequest -Uri $url -OutFile $path
    return $path;
}

Function Add-Local-Dependency ($deps, $path) {
    $filename = Split-Path $path -leaf
    if ($deps -contains $filename) {
        Throw New-Object System.ArgumentException "$($filename) already is a dependency"
    }
    Write-Host "Adding dependency $($filename), path: $($path)"
    $deps.Add($path)
}

Function Add-Dependency ($deps, $url) {
    Add-Local-Dependency $deps (Load-File $url)
}

Function Dependencies-To ($deps, $path) {
    $output = ConvertTo-Json $deps
    Set-Content -Path $path -Value $output
}

if (-Not (Test-Path -Path $include_dir)) {
    New-Item -ItemType directory $include_dir
}

Add-Dependency $dependencies "https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/dist/cytoscape.min.js" 
Add-Dependency $dependencies "https://raw.githubusercontent.com/cytoscape/cytoscape.js-cxtmenu/master/cytoscape-cxtmenu.js" 
Add-Dependency $dependencies "https://raw.githubusercontent.com/cytoscape/cytoscape.js-klay/master/cytoscape-klay.js" 
Add-Dependency $dependencies "https://raw.githubusercontent.com/OpenKieler/klayjs/master/klay.js" 
Add-Dependency $dependencies "https://code.jquery.com/jquery-3.4.1.min.js" 
Add-Dependency $dependencies "https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" 

Add-Local-Dependency $dependencies "src/rabbitmq.js"

#Dependencies-To $dependencies "deps.json"

Write-Host "done"