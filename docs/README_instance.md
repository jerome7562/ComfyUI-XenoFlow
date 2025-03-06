# Instance Node for ComfyUI


## Plugin Information
- **Name**: InstanceNode
- **Version**: 1.0.0
- **Release Date**: February 16, 2025
- **Author**: Jerome Bacquet
- **Organization**: CIRCUS
- **License**: GNU General Public license version 3


## Description
**InstanceNode** is a powerful extension for **ComfyUI** that introduces node instancing functionality. This plugin allows users to create instances of nodes that dynamically sync their widgets and inputs with the original source node.

This plugin is designed to improve workflow efficiency in **ComfyUI**, making complex node management more intuitive and effective.
The main objective is to simplify the visualization of complex graphs by limiting line crossing and long rerouting lines.

**IMPORTANT**: a node instance is not editable and it inherits all the properties of its source node. 
It's just a visual representation to facilitate connections, but **it doesn't need to be evaluated** !


## Features
- **Node Instancing**: Addition of a “Instance Node” option in the context menu to create instance of a source node that remain linked.
- **Synchronized Widgets & Input**: Any changes in the source node's widgets propagate automatically to all its instances.
- **Auto-resizing Nodes**: The plugin dynamically adjusts node sizes based on their content for better visibility
- **Visual Representation**: Provides a yellow color circle and dashed-line links to distinguish instances from standard node connections.
- **Graph Persistence**:  Automatically rebuilds instance links upon graph load and manages node deletion intelligently to preserve structure.
- **Dynamic Node Management**: Handles node removal and reassignments seamlessly.


## Usage
- Right-click on a node and select **Instance Node** to create a linked replicate.
- A replicate node can be recognized by the red circle at top left. 
- Adjust any widget in the original node, and the changes will reflect across all instances.
- Deleting an original node will reassign the first instance node as the new source. 
  This instance then recovers all its properties and becomes editable again.
- Select a instance node to show the relashionship with the nodes sources by a yellow dashline.
- Select a source node to show the relashionship with all replicate nodes by red dashlines.


## Licence
This plugin is distributed under the **GNU General Public license version 3** license. (see the LICENSE file for more information).



