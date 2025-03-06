// ComfyUI-Tricks1: Replicate Node Functionality
// This extension allows creating replicate nodes that are linked to a source node

import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "ReplicateNode",
    async setup() {
        const REPLICATE_COLOR = "#FF5555";
        const replicationLinks = new Map();
        const widgetSyncCache = new Map();

        // Fonction pour vérifier si un widget a un input connecté
        function widgetHasInput(node, widgetName) {
            return node.inputs?.some(input => 
                input.widget?.name === widgetName && input.link !== null
            ) || false;
        }

        // Fonction pour déterminer si un widget doit être synchronisé
        function shouldSyncWidget(node, widgetIndex, widgetName) {
            // Ne pas synchroniser les widgets avec des inputs connectés
            return !widgetHasInput(node, widgetName);
        }

        // Fonction pour obtenir la valeur d'un widget depuis les autres réplicats
        function getWidgetValueFromReplicates(sourceNode, widgetIndex, widgetName) {
            const allReplicates = replicationLinks.get(sourceNode.id) || [];
            const allNodes = [sourceNode, ...allReplicates];
            
            // Chercher dans tous les nœuds pour trouver une valeur à synchroniser
            for (const node of allNodes) {
                if (node?.widgets && node.widgets[widgetIndex] && 
                    !widgetHasInput(node, widgetName)) {
                    return node.widgets[widgetIndex].value;
                }
            }
            
            // Si aucune valeur n'est trouvée, retourner la valeur actuelle
            return sourceNode.widgets[widgetIndex].value;
        }

        // Fonction pour mettre en place la synchronisation des widgets
        function setupWidgetSync(sourceNode) {
            if (!sourceNode?.id) return;

            const allReplicates = replicationLinks.get(sourceNode.id) || [];
            const allNodes = [sourceNode, ...allReplicates];

            allNodes.forEach(node => {
                if (!node?.widgets) return;
                
                node.widgets.forEach((widget, i) => {
                    const widgetName = widget.name;
                    
                    if (!widget._originalCallback) {
                        widget._originalCallback = widget.callback;
                    }
                    
                    widget.callback = (value) => {
                        if (widget._syncCallback) return;
                        
                        // Si ce widget a un input, ne pas propager le changement
                        if (widgetHasInput(node, widgetName)) {
                            // Appeler juste le callback original
                            if (widget._originalCallback) {
                                widget._originalCallback(value, widget, node);
                            }
                            return;
                        }
                        
                        // Propager le changement aux autres nœuds
                        widget._syncCallback = true;
                        
                        allNodes.forEach(targetNode => {
                            if (targetNode && targetNode !== node && 
                                targetNode.widgets[i] && 
                                !widgetHasInput(targetNode, widgetName)) {
                                
                                targetNode.widgets[i].value = value;
                                targetNode.setDirtyCanvas(true, false);
                                
                                if (targetNode.widgets[i].callback) {
                                    targetNode.widgets[i].callback(value, targetNode.widgets[i], targetNode);
                                }
                            }
                        });
                        
                        widget._syncCallback = false;
                        
                        // Appeler le callback original
                        if (widget._originalCallback) {
                            widget._originalCallback(value, widget, node);
                        }
                    };
                });
            });

            widgetSyncCache.set(sourceNode.id, allNodes);
        }

        // Fonction pour gérer la connexion d'un input
        function handleConnectionChange(nodeId, inputIndex, outputId) {
            const node = app.graph.getNodeById(nodeId);
            if (!node) return;
            
            // Si le nœud n'est pas un réplicat et n'a pas de réplicats, ignorer
            if (!node.properties?.is_replicate && !replicationLinks.has(node.id)) return;
            
            // Trouver le nœud source
            const sourceNodeId = node.properties?.source_node_id || node.id;
            const sourceNode = app.graph.getNodeById(sourceNodeId);
            if (!sourceNode) return;
            
            // Récupérer l'input qui a été connecté/déconnecté
            const input = node.inputs[inputIndex];
            if (!input || !input.widget) return;
            
            const widgetName = input.widget.name;
            const widgetIndex = node.widgets.findIndex(w => w.name === widgetName);
            if (widgetIndex === -1) return;
            
            // Si un output est connecté, désactiver la synchronisation
            if (outputId !== null) {
                // Ne rien faire d'autre - le widget ne sera plus synchronisé
            } else {
                // L'input a été déconnecté, réactiver la synchronisation
                // et mettre à jour la valeur du widget à partir des autres réplicats
                const newValue = getWidgetValueFromReplicates(sourceNode, widgetIndex, widgetName);
                node.widgets[widgetIndex].value = newValue;
                node.setDirtyCanvas(true, false);
            }
            
            // Mettre à jour la synchronisation des widgets
            setupWidgetSync(sourceNode);
        }

        // Fonction de reconstruction des liens de réplication
        function rebuildReplicationLinks() {
            replicationLinks.clear();
            
            // Parcourir tous les nœuds du graphe
            for (const node of app.graph._nodes) {
                if (node.properties?.is_replicate && node.properties?.source_node_id) {
                    const sourceId = node.properties.source_node_id;
                    if (!replicationLinks.has(sourceId)) {
                        replicationLinks.set(sourceId, []);
                    }
                    replicationLinks.get(sourceId).push(node);
                    
                    // Configurer la synchronisation des widgets pour le nœud source
                    const sourceNode = app.graph.getNodeById(sourceId);
                    if (sourceNode) {
                        setupWidgetSync(sourceNode);
                    }
                }
            }
        }

        // Remplacer la méthode de configuration du graphe
        const originalConfigure = app.graph.configure;
        app.graph.configure = function(config) {
            const result = originalConfigure.call(this, config);
            
            // Reconstruire les compteurs de réplication lors du chargement du graphe
            replicateCounters.clear();
            for (const node of app.graph._nodes) {
                if (node.properties?.is_replicate && node.properties?.source_node_id) {
                    const sourceId = node.properties.source_node_id;
                    const replicateNumber = node.properties.replicate_number || 
                                           parseInt(node.title.split('_r').pop()) || 0;
                    
                    // Mettre à jour le compteur avec la valeur maximale trouvée
                    if (!replicateCounters.has(sourceId) || replicateCounters.get(sourceId) < replicateNumber) {
                        replicateCounters.set(sourceId, replicateNumber);
                    }
                }
            }
            
            setTimeout(rebuildReplicationLinks, 100);
            return result;
        };

        // Intercepter les événements de connexion/déconnexion
        const originalConnect = LGraph.prototype.connect;
        LGraph.prototype.connect = function(nodeOutId, outSlot, nodeInId, inSlot) {
            const result = originalConnect.call(this, nodeOutId, outSlot, nodeInId, inSlot);
            handleConnectionChange(nodeInId, inSlot, nodeOutId);
            return result;
        };
        
        const originalRemoveLink = LGraph.prototype.removeLink;
        LGraph.prototype.removeLink = function(linkId) {
            const link = this.links[linkId];
            if (link) {
                const nodeInId = link.target_id;
                const inSlot = link.target_slot;
                const result = originalRemoveLink.call(this, linkId);
                handleConnectionChange(nodeInId, inSlot, null);
                return result;
            }
            return originalRemoveLink.call(this, linkId);
        };

        // Map pour suivre les compteurs de réplication par nœud source
        const replicateCounters = new Map();
        
        const originalGetNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions;
        LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
            const options = originalGetNodeMenuOptions.call(this, node);
            
            // Placer l'option à la 4ème position en partant du bas
            const replicateIndex = options.length - 2;
            
            options.splice(replicateIndex, 0, {
                content: "Replicate Node",
                callback: () => {
                    const sourceNodeId = node.properties?.source_node_id || node.id;
                    const sourceNode = app.graph.getNodeById(sourceNodeId);

                    if (!sourceNode) {
                        console.warn("Impossible de trouver le nœud source.");
                        return;
                    }

                    const nodeType = LiteGraph.createNode(sourceNode.type);
                    if (nodeType) {
                        const replicate = app.graph.add(nodeType);
                        
                        // Obtenir ou initialiser le compteur pour ce nœud source
                        if (!replicateCounters.has(sourceNodeId)) {
                            replicateCounters.set(sourceNodeId, 0);
                        }
                        // Incrémenter le compteur pour ce nœud source
                        const counter = replicateCounters.get(sourceNodeId) + 1;
                        replicateCounters.set(sourceNodeId, counter);
                        
                        Object.assign(replicate, {
                            pos: [...app.canvas.graph_mouse],
                            properties: {
                                ...sourceNode.properties,
                                is_replicate: true,
                                source_node_id: sourceNodeId,
                                original_type: sourceNode.type,
                                // Stocker le numéro de ce réplicat dans les propriétés
                                replicate_number: counter
                            },
                            title: `${sourceNode.title}_r${counter}`,
                            boxcolor: REPLICATE_COLOR,
                            color: sourceNode.color,
                            bgcolor: sourceNode.bgcolor,
                            inputs: sourceNode.inputs?.map(input => ({ ...input, link: null })) || [],
                            outputs: sourceNode.outputs?.map(output => ({ ...output, links: [] })) || [],
                            widgets: sourceNode.widgets?.map(widget => ({ ...widget })) || []
                        });

                        if (!replicationLinks.has(sourceNodeId)) {
                            replicationLinks.set(sourceNodeId, []);
                        }
                        replicationLinks.get(sourceNodeId).push(replicate);

                        setupWidgetSync(sourceNode);
                        replicate.setDirtyCanvas(true, true);
                    }
                }
            });

            return options;
        };
        
        // Gérer la suppression d'un nœud
        app.graph.onNodeRemoved = function(node) {
            if (replicationLinks.has(node.id)) {
                const replicates = replicationLinks.get(node.id);
                if (replicates.length > 0) {
                    const newSource = replicates.shift(); 
                    newSource.properties.is_replicate = false;
                    delete newSource.properties.source_node_id;

                    replicates.forEach(rep => {
                        rep.properties.source_node_id = newSource.id;
                    });

                    replicationLinks.set(newSource.id, replicates);
                    setupWidgetSync(newSource);
                }
                replicationLinks.delete(node.id);
            }

            replicationLinks.forEach((replicates, sourceId) => {
                const newReplicates = replicates.filter(rep => rep.id !== node.id);
                if (newReplicates.length === 0) {
                    replicationLinks.delete(sourceId);
                } else {
                    replicationLinks.set(sourceId, newReplicates);
                }
            });
        };

        // Extension supplémentaire pour la création de nœuds
        app.registerExtension({
            name: "ReplicateNodeSetup",
            async nodeCreated(node) {
                if (node.properties?.is_replicate) {
                    const sourceNode = app.graph.getNodeById(node.properties.source_node_id);
                    if (sourceNode) {
                        node.widgets = sourceNode.widgets?.map(widget => ({ ...widget })) || [];
                        setupWidgetSync(sourceNode);
                    }
                }
            }
        });

        // Fonction pour déterminer la taille d'un nœud réduit
        function getCollapsedNodeSize(node) {
            if (!node.flags?.collapsed) return node.size;
            let titleWidth = node.title ? node.title.length * 8 : 80;
            let height = 30;
            return [titleWidth, height];
        }

        // Fonction pour calculer le centre d'un nœud
        function getNodeCenter(node) {
            let size = node.flags?.collapsed ? getCollapsedNodeSize(node) : node.size;
            let centerX = node.pos[0] + size[0] / 2;
            let centerY = node.pos[1] + (node.flags?.collapsed ? -15 : size[1] / 2);
            return [centerX, centerY];
        }

        // Remplacement de la fonction de dessin pour afficher les lignes pointillées
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
            
            ctx.strokeStyle = REPLICATE_COLOR;
            ctx.lineWidth = lineWidth;

            replicationLinks.forEach((replicates, sourceId) => {
                const sourceNode = this.graph.getNodeById(sourceId);

                replicates.forEach(replicateNode => {
                    if (sourceNode && replicateNode) {
                        const shouldDrawFromSource = sourceNode.selected;
                        const shouldDrawFromReplicate = replicateNode.selected;

                        if (shouldDrawFromSource || shouldDrawFromReplicate) {
                            ctx.beginPath();

                            const [sourceX, sourceY] = getNodeCenter(sourceNode);
                            const [repX, repY] = getNodeCenter(replicateNode);

                            ctx.moveTo((sourceX + offset[0]) * scale, (sourceY + offset[1]) * scale);
                            ctx.lineTo((repX + offset[0]) * scale, (repY + offset[1]) * scale);
                            ctx.stroke();
                        }
                    }
                });
            });
            ctx.restore();
        };
    }
});
