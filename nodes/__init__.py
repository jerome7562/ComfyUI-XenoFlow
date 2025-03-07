# ComfyUI-XenoFlow
# Initialization file for the nodes package
# Imports and combines node definitions from all modules

# Import node classes from individual modules
from .replicate_node import NODE_CLASS_MAPPINGS as REPLICATE_NODE_CLASS_MAPPINGS
from .replicate_node import NODE_DISPLAY_NAME_MAPPINGS as REPLICATE_NODE_DISPLAY_NAME_MAPPINGS

from .instance_node import NODE_CLASS_MAPPINGS as INSTANCE_NODE_CLASS_MAPPINGS
from .instance_node import NODE_DISPLAY_NAME_MAPPINGS as INSTANCE_NODE_DISPLAY_NAME_MAPPINGS

# Combine node mappings from all modules
NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(REPLICATE_NODE_CLASS_MAPPINGS)
NODE_CLASS_MAPPINGS.update(INSTANCE_NODE_CLASS_MAPPINGS)

# Combine display name mappings from all modules
NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(REPLICATE_NODE_DISPLAY_NAME_MAPPINGS)
NODE_DISPLAY_NAME_MAPPINGS.update(INSTANCE_NODE_DISPLAY_NAME_MAPPINGS)

# Make them available for import
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
