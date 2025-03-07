// ComfyUI-XenoFlow: Save Workflow Functionality
// File: web/save_workflow.js

console.log("Save Workflow Extension Loading");

// Wait for app to be available
function waitForApp(callback) {
    if (window.app) {
        callback(window.app);
    } else {
        setTimeout(() => waitForApp(callback), 500);
    }
}

waitForApp((app) => {
    // Store original menu function
    const originalMenu = LGraphCanvas.prototype.getCanvasMenuOptions;
    
    // Store last save path (initialized to default)
    let lastSavePath = "user"; // Default directory
    
    // Function to save workflow
    function saveWorkflow() {
        try {
            const workflowData = app.graph.serialize();
            const workflowJSON = JSON.stringify(workflowData, null, 2);
            
            // Use browser's file API to save to the specified directory
            // Note that browsers have security restrictions for file access
            // This implementation uses FileSystem Access API if available
            
            if ('showSaveFilePicker' in window) {
                const savePicker = async () => {
                    try {
                        const opts = {
                            suggestedName: "workflow.json",
                            types: [{
                                description: 'JSON Files',
                                accept: {'application/json': ['.json']}
                            }],
                            // Try to set initial directory (may not be supported by all browsers)
                            startIn: lastSavePath
                        };
                        
                        const fileHandle = await window.showSaveFilePicker(opts);
                        lastSavePath = fileHandle.name; // Update the last used path
                        
                        const writable = await fileHandle.createWritable();
                        await writable.write(workflowJSON);
                        await writable.close();
                        
                        console.log("Workflow saved successfully to", lastSavePath);
                    } catch (err) {
                        // If there's an error with the modern API, fall back to the classic method
                        fallbackSave();
                    }
                };
                
                savePicker();
            } else {
                fallbackSave();
            }
            
            // Classic save method as fallback
            function fallbackSave() {
                const blob = new Blob([workflowJSON], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "workflow.json";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log("Workflow saved using fallback method");
            }
        } catch (error) {
            console.error("Error saving workflow:", error);
            alert("Error saving workflow: " + error.message);
        }
    }

    // Add our custom menu option
    LGraphCanvas.prototype.getCanvasMenuOptions = function() {
        const options = originalMenu.call(this);
        
        options.push(null); // separator
        options.push({
            content: "💾 Save workflow as...",
            callback: saveWorkflow
        });
        
        return options;
    };
    
    console.log("Save Workflow Extension Menu Added");
});