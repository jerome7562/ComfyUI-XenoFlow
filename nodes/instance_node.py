# ComfyUI-XenoFlow: Instance Node Functionality
# This extension allows creating instance nodes that are linked to a source node
# File: nodes/instance_node.py

def get_node_class(source_class):
    """
    Creates a new class that inherits from the source class
    """
    class InstanceNode(source_class):
        def __init__(self):
            super().__init__()
            self.is_instance = True
            
    return InstanceNode

def sync_instance_values(graph):
    """
    Synchronizes values between source nodes and their instances
    """
    for node in graph.nodes.values():
        if getattr(node, 'is_instance', False) and hasattr(node, 'source_node_id'):
            source_node = graph.nodes.get(node.source_node_id)
            if source_node:
                # Synchronize widgets and values
                if hasattr(source_node, 'widgets'):
                    for widget_name, widget in source_node.widgets.items():
                        if hasattr(node, 'widgets') and widget_name in node.widgets:
                            try:
                                node.widgets[widget_name].value = widget.value
                            except AttributeError:
                                print(f"Error syncing widget '{widget_name}' for node '{node.id}'")

# Node registration
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
