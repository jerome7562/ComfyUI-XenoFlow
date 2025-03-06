# ComfyUI-Tricks1: A collection of utilities for ComfyUI
# This package includes:
# - Instance nodes: Create linked instances of existing nodes
# - Replicate nodes: Create copies of nodes with synchronized widgets
# - Save workflow: Easily save workflows as JSON files

import os
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Register this module's directory for web assets
WEB_DIRECTORY = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")

# Graph functions for execution
def sync_node_values(graph):
    """
    Synchronizes values between source nodes and their replications/instances
    """
    from .nodes.replicate_node import sync_replicate_values
    from .nodes.instance_node import sync_instance_values
    
    # Synchronize both replicate and instance nodes
    sync_replicate_values(graph)
    sync_instance_values(graph)

# Make available to ComfyUI
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY", "sync_node_values"]
