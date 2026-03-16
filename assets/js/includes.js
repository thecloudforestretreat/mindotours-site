async function loadIncludes(){

const header=document.getElementById("siteHeader");
const footer=document.getElementById("siteFooter");

if(header){

const res=await fetch("/assets/includes/header.html");
header.innerHTML=await res.text();

}

if(footer){

const res=await fetch("/assets/includes/footer.html");
footer.innerHTML=await res.text();

}

}

document.addEventListener("DOMContentLoaded",loadIncludes);
