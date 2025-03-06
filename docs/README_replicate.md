# Replicate Node for ComfyUI


## Plugin Information
- **Name**: ReplicateNode
- **Version**: 1.0.0
- **Release Date**: February 16, 2025
- **Author**: Jerome Bacquet
- **Organization**: CIRCUS
- **License**: GNU General Public license version 3


## Description
**ReplicateNode** is a plugin designed for **ComfyUI** that introduces node replication functionality. This extension allows users to create synchronized replicate of existing nodes within the ComfyUI graph system. Replicate's widgets are synchronized, but inputs are not, to allow different connections between replicates. All replicate nodes remain editable. Modifying a widget in one replicate modifies similar widgets in all other replicates + the source node.  

This plugin is designed to improve workflow efficiency in **ComfyUI**, making complex node management more intuitive and effective.

**IMPORTANT**: a replicate node doesn't necessarily use the same inputs as the source node and needs to be evaluated in the graph (unlike an instance node). Each replicate is therefore independent and must be evaluated.

## Features
- **Node Replication**: Addition of a “Replicate Node” option in the context menu to duplicate a node with automatic synchronization of properties.
- **Automatic Widget Syncing**:  Ensures that changes made to a node are propagated to all replicates (including the source node).
- **Visual Representation**: Provides a red color circle and dashed-line links to distinguish replicates from standard node connections..
- **Graph Persistence**: Rebuilds replication links upon loading a workflow.
- **Dynamic Node Management**: Handles node removal and reassignments seamlessly.


## Usage
- Right-click on a node and select **Replicate Node** to create a linked replicate.
- A replicate node can be recognized by the red circle at top left. 
- Adjust any widget in the original node, and the changes will reflect across all replicates.
- Adjust any widget on one of the replicates and the changes will be reflected on all linked nodes (including the source).
- Deleting an original node will reassign the first replicate node as the new source.
- Select a replicate node to show the relashionship with the nodes sources by a red dashline.
- Select a source node to show the relashionship with all replicate nodes by red dashlines.


## Licence
This plugin is distributed under the **GNU General Public license version 3**. (see the LICENSE file for more information).



