$( document ).ready(function() {
    setTimeout(() => {
      $("#address-input").val("");
      $(".data-gather-properties").attr("style","visibility: hidden;"); 
      $("#interactive-btn").html("Initialize Connector");
        
    }, 100);
});