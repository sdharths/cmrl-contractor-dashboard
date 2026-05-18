import React, { useEffect, useRef } from "react";

function Analytical() {
  const tableauRef = useRef(null);

  useEffect(() => {
    const divElement = tableauRef.current;
    const vizElement = divElement.getElementsByTagName("object")[0];

    // Full Screen Dashboard
    vizElement.style.width = "100%";
    vizElement.style.height = "100vh";

    const scriptElement = document.createElement("script");
    scriptElement.src =
      "https://public.tableau.com/javascripts/api/viz_v1.js";
    scriptElement.async = true;

    vizElement.parentNode.insertBefore(scriptElement, vizElement);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        className="tableauPlaceholder"
        id="viz1778734010983"
        ref={tableauRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <noscript>
          <a href="/">
            <img
              alt="Dashboard"
              src="https://public.tableau.com/static/images/CM/CMRL_CONTRACTORS_BILLING/Dashboard/1_rss.png"
              style={{
                border: "none",
                width: "100%",
              }}
            />
          </a>
        </noscript>

        <object
          className="tableauViz"
          style={{
            display: "none",
          }}
        >
          <param
            name="host_url"
            value="https%3A%2F%2Fpublic.tableau.com%2F"
          />

          <param name="embed_code_version" value="3" />

          <param name="site_root" value="" />

          <param
            name="name"
            value="CMRL_CONTRACTORS_BILLING/Dashboard"
          />

          <param name="tabs" value="no" />

          <param name="toolbar" value="yes" />

          <param
            name="static_image"
            value="https://public.tableau.com/static/images/CM/CMRL_CONTRACTORS_BILLING/Dashboard/1.png"
          />

          <param name="animate_transition" value="yes" />

          <param name="display_static_image" value="yes" />

          <param name="display_spinner" value="yes" />

          <param name="display_overlay" value="yes" />

          <param name="display_count" value="yes" />

          <param name="language" value="en-US" />

          <param name="filter" value="publish=yes" />
        </object>
      </div>
    </div>
  );
}

export default Analytical;