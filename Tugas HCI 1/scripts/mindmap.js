import { showMessageModal } from './utility.js';

const graph = {
  nodes: [],
  links: [],
};

// Create a mapping of tags to nodes
const tagMap = {};

async function createGraphFromTasks() {
  console.log("calling for graphs...");
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  console.log(currentUser);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username: currentUser.username,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch("http://localhost:3001/getTasks", requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      console.log(data);

      data.tasks.forEach((item) => {
        if (!item) return;

        const { title, tags } = item;
        graph.nodes.push({ id: title, group: 1 }); // You can modify the group as needed

        // Split tags into an array and iterate through them
        const tagsArray = tags.split(",");
        tagsArray.forEach((tag) => {
          if (!tagMap[tag]) {
            tagMap[tag] = [];
          }
          tagMap[tag].push(title); // Map the tag to the title
        });
      });

      // Create links based on shared tags
      for (const tag in tagMap) {
        const titles = tagMap[tag];
        for (let i = 0; i < titles.length; i++) {
          for (let j = i + 1; j < titles.length; j++) {
            graph.links.push({ source: titles[i], target: titles[j] });
          }
        }
      }

      console.log(graph);

      drawGraph(graph);
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while fetching tasks!");
    });
}

function drawGraph(graph) {
  const width = 800;  // Width of the SVG container
  const height = 600; // Height of the SVG container

  // Remove existing SVG if it exists
  d3.select("svg").remove();

  // Create an SVG element with a white background
  const svg = d3.select(".container-fluid.align-items-center")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#fff"); // Set background color

  // Create a simulation for the nodes and links
  const simulation = d3.forceSimulation(graph.nodes)
  .force("link", d3.forceLink().id(d => d.id).distance(140).strength(1))  // Increase link strength
  .force("charge", d3.forceManyBody().strength(-400))  // Increase node repulsion (stronger negative charge)
  .force("center", d3.forceCenter(width / 2, height / 2))  // Center the graph in the SVG
  .force("collide", d3.forceCollide().radius(30));  // Add collision detection to avoid node overlap


  // Create link elements
  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", 2)
    .attr("stroke", "#999");

  // Create node elements
  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "node");

  // Append circles for nodes
  node.append("circle")
    .attr("r", 8)
    .attr("fill", "rgb(42, 207, 219)")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  // Append text for node IDs with black color and no stroke
  node.append("text")
    .attr("dx", 12)   // X offset for text
    .attr("dy", 6)    // Y offset for text
    .attr("font-size", "18px") // Font size for text
    .style("fill", "black") // Set text color to black
    .style("stroke", "none") // Ensure no stroke on text
    .text(d => d.id); // Set text to node ID

  // Update simulation on each tick
  simulation
    .nodes(graph.nodes)
    .on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`); // Position nodes and text
    });

  simulation.force("link")
    .links(graph.links);

  // Drag event functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    // Calculate the new position with constraints
    const newX = Math.max(5, Math.min(width - 5, event.x)); // Ensure node stays within bounds
    const newY = Math.max(5, Math.min(height - 5, event.y)); // Ensure node stays within bounds

    d.fx = newX;
    d.fy = newY;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}


createGraphFromTasks();
