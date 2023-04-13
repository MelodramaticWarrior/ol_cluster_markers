# ol_cluster_markers
OpenLayers: attempt at improving browser performace by clustering marker.

## Issues
- There's memory leak in this implementation; possibly memory aren't being freed due to layers not set properly. 
  Steps to reproduce: 
  1. run vite server 
  2. open browser tab performance ("shift + esc" for most browsers) -> check RAM consumption
  3. zoom in and zoom out multiple times (x5~10, or more) -> check RAM consumption
