// ComfyUI-Tricks1: Instance Node Functionality
// This extension allows creating instance nodes that are linked to a source node

import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "InstanceNode",
    async setup() {
        const INSTANCE_COLOR = "#FFCC00";
        const instanceLinks = new Map();
        const widgetSyncCache = new Map();
        // Map pour suivre les compteurs d'instance par nœud source (comme dans replicate.js)
        const instanceCounters = new Map();

        // Function to propagate input changes to instances
        function propagateInputChanges(sourceNode) {
            if (!sourceNode?.id || !instanceLinks.has(sourceNode.id)) return;
            
            const instances = instanceLinks.get(sourceNode.id);
            instances.forEach(instance => {
                if (instance && instance.properties?.is_instance) {
                    updateInstanceInputs(instance, sourceNode);
                    instance.setDirtyCanvas(true, true);
                }
            });
        }
        // Sets up widget synchronization between the source node and all its instances.
        // Each widget is assigned a callback that updates the value in all linked nodes.
        function setupWidgetSync(sourceNode) {
            if (!sourceNode?.id) return;

            const allInstances = instanceLinks.get(sourceNode.id) || [];
            const allNodes = [sourceNode, ...allInstances];

            allNodes.forEach(node => {
                if (!node?.widgets) return;
                node.widgets.forEach((widget, i) => {
                    // Save the original callback if not already saved
                    if (!widget._originalCallback) {
                        widget._originalCallback = widget.callback;
                    }
                    // Redefine the callback to synchronize values
                    widget.callback = function(value) {
                        if (widget._syncCallback) return;
                        widget._syncCallback = true;
                        allNodes.forEach(targetNode => {
                            if (targetNode && targetNode !== node && targetNode.widgets[i]) {
                                targetNode.widgets[i].value = value;
                                targetNode.setDirtyCanvas(true, false);
                                if (targetNode.widgets[i].callback) {
                                    targetNode.widgets[i].callback(value, targetNode.widgets[i], targetNode);
                                }
                            }
                        });
                        widget._syncCallback = false;
                    };
                });
            });

            widgetSyncCache.set(sourceNode.id, allNodes);
        }
        // Updates the inputs of an instance based on the inputs of the source node.
        // If the inputs_hidden property is active, the inputs are hidden.
        function updateInstanceInputs(node, sourceNode) {
            if (!node?.properties?.is_instance || !sourceNode) return;

            if (node.properties.inputs_hidden) {
                node.inputs = [];
            } else {
                // Copy the inputs from the source node
                node.inputs = sourceNode.inputs?.map(input => ({ 
                    name: input.name,
                    type: input.type,
                    link: null,
                    slot_index: input.slot_index,
                    ...input
                })) || [];
            }

            // Recalculate the instance's size based on its inputs and widgets
            node.size = calculateNodeSize(node);
            node.setDirtyCanvas(true, true);
        }
        // Calculates the node size based on its title, widgets, and number of ports.
        function calculateNodeSize(node) {
            const titleWidth = node.title ? node.title.length * 8 : 80;
            let widgetWidth = 0;
            if (!node.properties?.widgets_hidden && node.widgets) {
                widgetWidth = node.widgets.reduce((maxWidth, widget) => {
                    const widgetTextWidth = (widget.name?.length || 0) * 8;
                    return Math.max(maxWidth, widgetTextWidth + 40);
                }, 0);
            }
            
            const contentWidth = Math.max(titleWidth, widgetWidth);
            const widthWithMargin = Math.ceil(contentWidth * 1.15);

            // Height based on the number of ports (inputs/outputs)
            const outputCount = node.outputs?.length || 0;
            const inputCount = node.properties?.inputs_hidden ? 0 : (node.inputs?.length || 0);
            const totalPorts = Math.max(inputCount, outputCount);
            const portHeight = totalPorts * 20;

            // Height based on widgets
            const widgetCount = !node.properties?.widgets_hidden ? (node.widgets?.length || 0) : 0;
            const widgetHeight = widgetCount * 28;
            
            const totalHeight = portHeight + widgetHeight;
            const heightWithMargin = Math.ceil(totalHeight * 1.2);

            // Minimum dimensions
            const minWidth = 120;
            const minHeight = 30;
            
            return [
                Math.max(minWidth, widthWithMargin),
                Math.max(minHeight, heightWithMargin)
            ];
        }
        // Rebuilds the links between source nodes and instances by iterating over all graph nodes.
        // This function is useful after configuration changes or loading.
        function rebuildInstanceLinks() {
            instanceLinks.clear();
            widgetSyncCache.clear();
            
            // Reconstruire les compteurs d'instance lors du chargement du graphe
            instanceCounters.clear();
            
            for (const node of app.graph._nodes) {
                if (node.properties?.is_instance && node.properties?.source_node_id) {
                    const sourceId = node.properties.source_node_id;
                    if (!instanceLinks.has(sourceId)) {
                        instanceLinks.set(sourceId, []);
                    }
                    instanceLinks.get(sourceId).push(node);
                    
                    // Mettre à jour le compteur avec la valeur maximale trouvée
                    const instanceNumber = node.properties.instance_number || 
                                         parseInt(node.title.split('_i').pop()) || 0;
                    
                    if (!instanceCounters.has(sourceId) || instanceCounters.get(sourceId) < instanceNumber) {
                        instanceCounters.set(sourceId, instanceNumber);
                    }
                    
                    const sourceNode = app.graph.getNodeById(sourceId);
                    if (sourceNode) {
                        setupWidgetSync(sourceNode);
                        updateInstanceInputs(node, sourceNode);
                    }
                }
            }
        }
        // Overriding LGraphNode methods to propagate input changes to instances

        // Overrides onConnectionsChange to propagate connection changes.
        const originalOnConnectionsChange = LGraphNode.prototype.onConnectionsChange;
        LGraphNode.prototype.onConnectionsChange = function(type, slotIndex, isConnected, link, ioSlot) {
            if (originalOnConnectionsChange) {
                originalOnConnectionsChange.call(this, type, slotIndex, isConnected, link, ioSlot);
            }
            if (instanceLinks.has(this.id)) {
                propagateInputChanges(this);
            }
        };

        // Overrides onInputAdded to propagate the addition of an input.
        const originalOnInputAdded = LGraphNode.prototype.onInputAdded;
        LGraphNode.prototype.onInputAdded = function(input) {
            if (originalOnInputAdded) {
                originalOnInputAdded.call(this, input);
            }
            if (instanceLinks.has(this.id)) {
                propagateInputChanges(this);
            }
        };

        // Overrides onInputRemoved to propagate the removal of an input.
        const originalOnInputRemoved = LGraphNode.prototype.onInputRemoved;
        LGraphNode.prototype.onInputRemoved = function(slot) {
            if (originalOnInputRemoved) {
                originalOnInputRemoved.call(this, slot);
            }
            if (instanceLinks.has(this.id)) {
                propagateInputChanges(this);
            }
        };

        // Overrides setInput to propagate input modifications.
        const originalSetInput = LGraphNode.prototype.setInput;
        LGraphNode.prototype.setInput = function(slot, value) {
            const result = originalSetInput?.call(this, slot, value);
            if (instanceLinks.has(this.id)) {
                propagateInputChanges(this);
            }
            return result;
        };

        // Graph Configuration
        const originalConfigure = app.graph.configure;
        app.graph.configure = function(config) {
            const result = originalConfigure.call(this, config);
            
            const instanceNodes = this._nodes.filter(node => node.properties?.is_instance);
            instanceNodes.forEach(node => {
                const sourceNode = this.getNodeById(node.properties.source_node_id);
                if (sourceNode) {
                    node.inputs = []; // inputs hidden
                    node.widgets = []; // widgets hidden
                                        
                    updateInstanceInputs(node, sourceNode);
                    node.outputs = sourceNode.outputs?.map(output => ({ ...output, links: [] })) || [];
                    
                    if (!node.properties.widgets_hidden) {
                        node.widgets = sourceNode.widgets?.map(widget => {
                            const clonedWidget = { ...widget };
                            clonedWidget.disabled = true;
                            return clonedWidget;
                        }) || [];
                    }
                }
                node.widgets = [];
                node.onExecute = null; //prevents execution of proceedings 
            });
            
            setTimeout(rebuildInstanceLinks, 100);
            return result;
        };

        // Overrides setProperty to update properties specific to instances.
        const originalSetProperty = LGraphNode.prototype.setProperty;
        LGraphNode.prototype.setProperty = function(name, value) {
            const oldValue = this.properties[name];
            const result = originalSetProperty.call(this, name, value);

            if (this.properties?.is_instance && 
                (name === 'inputs_hidden' || name === 'widgets_hidden')) {
                
                const sourceNode = app.graph.getNodeById(this.properties.source_node_id);
                
                if (name === 'inputs_hidden') {
                    updateInstanceInputs(this, sourceNode);
                } else if (name === 'widgets_hidden') {
                    this.widgets = value ? [] : 
                        sourceNode.widgets?.map(widget => {
                            const clonedWidget = { ...widget };
                            clonedWidget.disabled = true;
                            return clonedWidget;
                        }) || [];
                }
                
                this.size = calculateNodeSize(this);
                this.setDirtyCanvas(true, true);
            }

            return result;
        };

        // Overrides cloneNode to properly handle duplication of an instance node.
        const originalCloneNode = LGraph.prototype.cloneNode;
        LGraph.prototype.cloneNode = function(node) {
            const clonedNode = originalCloneNode.call(this, node);

            if (clonedNode?.properties?.is_instance) {
                clonedNode.widgets = [];
                clonedNode.inputs = [];
                clonedNode.setDirtyCanvas(true, true);
            }

            return clonedNode;
        };

        // Overrides add to initialize instance nodes when they are added to the graph.
        const originalAddNode = LGraph.prototype.add;
        LGraph.prototype.add = function(node) {
            if (node?.properties?.is_instance) {
                node.widgets = []; // Suppression des widgets immédiatement après l'ajout
                node.inputs = [];
                node.setDirtyCanvas(true, true);
            }
            return originalAddNode.call(this, node);
        };

        // Overrides getInputLink to redirect the link from an instance node to its source node.
        const originalGetInputLink = LGraphNode.prototype.getInputLink;
        LGraphNode.prototype.getInputLink = function(slot) {
            const link = originalGetInputLink?.call(this, slot);
            if (!link) return null;

            const originNode = this.graph._nodes_by_id[link.origin_id];
            if (originNode?.properties?.is_instance) {
                const sourceNode = this.graph._nodes_by_id[originNode.properties.source_node_id];
                if (sourceNode) {
                    return {
                        ...link,
                        origin_id: sourceNode.id
                    };
                }
            }
            return link;
        };

 
        // Adds menu options in the canvas for instance nodes.
        const originalGetNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions;
        LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
            const options = originalGetNodeMenuOptions.call(this, node);
            const instanceIndex = options.length - 2;

            // DEBUG - DON'T ALLOW THIS OPTION FOR USER
            /*
            if (node.properties?.is_instance) {
                options.push(
                    {
                        content: node.properties?.widgets_hidden ? "Show Widgets" : "Hide Widgets",
                        callback: () => {
                            node.setProperty('widgets_hidden', !node.properties.widgets_hidden);
                        }
                    },
                    {
                        content: node.properties?.inputs_hidden ? "Show Inputs" : "Hide Inputs",
                        callback: () => {
                            node.setProperty('inputs_hidden', !node.properties.inputs_hidden);
                        }
                    }
                );
            }
            */
            options.splice(instanceIndex, 0, {
                content: "Instance Node",
                callback: () => {
                     // Determine the source node (either this node or its parent)
                    const sourceNodeId = node.properties?.source_node_id || node.id;
                    const sourceNode = app.graph.getNodeById(sourceNodeId);

                    if (!sourceNode) {
                        console.warn("Impossible de trouver le nœud source.");
                        return;
                    }

                    // Create a new instance based on the source node type
                    const nodeType = LiteGraph.createNode(sourceNode.type);
                    if (nodeType) {
                        // Obtenir ou initialiser le compteur pour ce nœud source
                        if (!instanceCounters.has(sourceNodeId)) {
                            instanceCounters.set(sourceNodeId, 0);
                        }
                        // Incrémenter le compteur pour ce nœud source
                        const counter = instanceCounters.get(sourceNodeId) + 1;
                        instanceCounters.set(sourceNodeId, counter);
                        
                        const instance = app.graph.add(nodeType);
                        instance.title = `${sourceNode.title}_i${counter}`;
                        
                        Object.assign(instance, {
                            pos: [...app.canvas.graph_mouse],
                            shape: LiteGraph.BOX_SHAPE,
                            properties: {
                                is_instance: true,
                                source_node_id: sourceNodeId,
                                original_type: sourceNode.type,
                                widgets_hidden: true,
                                inputs_hidden: true,
                                // Stocker le numéro de cette instance dans les propriétés
                                instance_number: counter
                            },
                            boxcolor: INSTANCE_COLOR,
                            color: sourceNode.color,
                            bgcolor: sourceNode.bgcolor,
                            inputs: [],
                            outputs: sourceNode.outputs?.map(output => ({ ...output, links: [] })) || [],
                            widgets: []
                        });

                        instance.size = calculateNodeSize(instance);

                        if (!instanceLinks.has(sourceNodeId)) {
                            instanceLinks.set(sourceNodeId, []);
                        }
                        instanceLinks.get(sourceNodeId).push(instance);

                        setupWidgetSync(sourceNode);
                        instance.setDirtyCanvas(true, true);
                    }
                }
            });

            return options;
        };
        // Overrides the remove method to manage the deletion of instance nodes.
        // If a source node is removed, properties are transferred to the remaining instances.
        const originalRemove = LGraph.prototype.remove;
        LGraph.prototype.remove = function(node) {
            if (node.properties?.is_instance) {
                // Removing an instance: update the map
                const sourceId = node.properties.source_node_id;
                if (sourceId && instanceLinks.has(sourceId)) {
                    const instances = instanceLinks.get(sourceId).filter(n => n.id !== node.id);
                    if (instances.length === 0) {
                        instanceLinks.delete(sourceId);
                        // Supprimer également le compteur associé
                        instanceCounters.delete(sourceId);
                    } else {
                        instanceLinks.set(sourceId, instances);
                    }
                    widgetSyncCache.delete(sourceId);
                }
            }
            else if (instanceLinks.has(node.id)) {
                // If the removed node has instances, select a new source
                const instances = instanceLinks.get(node.id);
                if (instances.length > 0) {
                    const newSource = instances.shift();
                    newSource.properties.is_instance = false;
                    delete newSource.properties.source_node_id;
                    delete newSource.properties.widgets_hidden;
                    delete newSource.properties.inputs_hidden;
                    delete newSource.properties.instance_number;
                    
                    newSource.shape = undefined;

                    newSource.inputs = node.inputs?.map(input => ({ ...input, link: null })) || [];
                    newSource.outputs = node.outputs?.map(output => ({ ...output, links: [] })) || [];
                    newSource.widgets = node.widgets?.map(widget => ({ ...widget })) || [];
                    newSource.size = node.size ? [...node.size] : [150, 60];

                    instances.forEach(inst => {
                        inst.properties.source_node_id = newSource.id;
                    });
                    instanceLinks.set(newSource.id, instances);
                    
                    // Transférer le compteur au nouveau nœud source
                    if (instanceCounters.has(node.id)) {
                        instanceCounters.set(newSource.id, instanceCounters.get(node.id));
                        instanceCounters.delete(node.id);
                    }
                    
                    setupWidgetSync(newSource);
                }
                instanceLinks.delete(node.id);
            }

            return originalRemove.call(this, node);
        };

        // Returns the size of a node when it is collapsed.
        function getCollapsedNodeSize(node) {
            if (!node.flags?.collapsed) return node.size;
            let titleWidth = node.title ? node.title.length * 8 : 80;
            let height = 30;
            return [titleWidth, height];
        }

        // Calculates the center of a node based on its position and size.
        function getNodeCenter(node) {
            let size = node.flags?.collapsed ? getCollapsedNodeSize(node) : node.size;
            let centerX = node.pos[0] + size[0] / 2;
            let centerY = node.pos[1] + (node.flags?.collapsed ? -15 : size[1] / 2);
            return [centerX, centerY];
        }

        // Overrides the canvas draw method to render a line between the source node and
        // each of its instances if either is selected.
        const originalDraw = LGraphCanvas.prototype.draw;
        LGraphCanvas.prototype.draw = function() {
            originalDraw.call(this);
            const ctx = this.ctx;
            if (!ctx) return;

            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            const scale = this.ds.scale;
            const offset = this.ds.offset;
           
            const scaleFactor = Math.min(Math.max((scale - 0.1) / (2 - 0.1), 0), 1) * 2;
            const lineWidth = Math.max(2 * scale, 0.2);
            const dashSize = Math.max(5 * scale, 0.2);
            const dashSpacing = Math.max(10 / scale, 5)
            ctx.setLineDash(dashSize > 0 ? [dashSize, dashSize] : []);
            
            ctx.strokeStyle = INSTANCE_COLOR;
            ctx.lineWidth = lineWidth;

            // Draw a line between each source node and its instances if either is selected
            instanceLinks.forEach((instances, sourceId) => {
                const sourceNode = this.graph.getNodeById(sourceId);

                instances.forEach(instanceNode => {
                    if (sourceNode && instanceNode) {
                        const shouldDrawFromSource = sourceNode.selected;
                        const shouldDrawFromInstance = instanceNode.selected;

                        if (shouldDrawFromSource || shouldDrawFromInstance) {
                            ctx.beginPath();
                            const [sourceX, sourceY] = getNodeCenter(sourceNode);
                            const [instX, instY] = getNodeCenter(instanceNode);
                            ctx.moveTo((sourceX + offset[0]) * scale, (sourceY + offset[1]) * scale);
                            ctx.lineTo((instX + offset[0]) * scale, (instY + offset[1]) * scale);
                            ctx.stroke();
                        }
                    }
                });
            });
            ctx.restore();
        };

        // Register the main extension (most of the overrides have already been defined)
        app.registerExtension({
            name: "InstanceNodeSetup",
            async nodeCreated(node) {
                if (node.properties?.is_instance) {
                    const sourceNode = app.graph.getNodeById(node.properties.source_node_id);
                    if (sourceNode) {
                        // Initialize default display properties
                        if (node.properties.widgets_hidden === undefined) {
                            node.properties.widgets_hidden = true;
                        }
                        if (node.properties.inputs_hidden === undefined) {
                            node.properties.inputs_hidden = true;
                        }
                        
                        // Add the instance node to the map for copy/paste management
                        if (!instanceLinks.has(sourceNode.id)) {
                            instanceLinks.set(sourceNode.id, []);
                        }
                        instanceLinks.get(sourceNode.id).push(node);
                        
                        // Update inputs and outputs based on the source node
                        updateInstanceInputs(node, sourceNode);
                        node.outputs = sourceNode.outputs?.map(output => ({ ...output, links: [] })) || [];
                        
                        // Mettre à jour les widgets si nécessaire
                        if (!node.properties.widgets_hidden) {
                            node.widgets = sourceNode.widgets?.map(widget => {
                                const clonedWidget = { ...widget };
                                // Rendre le widget en lecture seule
                                clonedWidget.disabled = true;
                                return clonedWidget;
                            }) || [];
                        }
                        // Synchronize widgets between the source node and its instances
                        setupWidgetSync(sourceNode);
                    }
                }
            }
        });
    }
});
