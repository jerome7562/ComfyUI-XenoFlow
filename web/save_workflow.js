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
    
    // Function to save workflow with File System Access API
    async function saveWithFileSystemAPI(workflowJSON) {
        try {
            const opts = {
                suggestedName: "workflow.json",
                types: [{
                    description: 'JSON Files',
                    accept: {'application/json': ['.json']}
                }]
                // Removed startIn as it can cause issues in some browsers
            };
            
            const fileHandle = await window.showSaveFilePicker(opts);
            if (!fileHandle) {
                console.log("No file handle received, user likely cancelled");
                return false; // User cancelled or no handle received
            }
            
            lastSavePath = fileHandle.name; // Update the last used path
            
            const writable = await fileHandle.createWritable();
            await writable.write(workflowJSON);
            await writable.close();
            
            console.log("Workflow saved successfully to", lastSavePath);
            return true; // Successfully saved
        } catch (err) {
            // Check if this is a user cancel action
            if (err.name === 'AbortError') {
                console.log("Save cancelled by user");
                return false; // User cancelled, don't use fallback
            }
            
            console.error("Error with File System Access API:", err);
            return null; // Return null to indicate an error (not cancellation)
        }
    }
    
    // Classic save method as fallback
    function fallbackSave(workflowJSON) {
        try {
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
            return true;
        } catch (error) {
            console.error("Error in fallback save:", error);
            return false;
        }
    }
    
    // Main save workflow function
    async function saveWorkflow() {
        try {
            const workflowData = app.graph.serialize();
            const workflowJSON = JSON.stringify(workflowData, null, 2);
            
            // First try the modern API if available
            if ('showSaveFilePicker' in window) {
                const result = await saveWithFileSystemAPI(workflowJSON);
                
                // Only use fallback if there was an error (not if user cancelled)
                if (result === null) {
                    console.log("Using fallback save method due to API error");
                    fallbackSave(workflowJSON);
                }
            } else {
                // Browser doesn't support File System Access API
                fallbackSave(workflowJSON);
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