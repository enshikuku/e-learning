const load = document.querySelector(".loader")
let students = document.querySelectorAll('.studentidandname')
let details = document.querySelectorAll('.studentdetailedinformation')
var button = document.querySelector('#scroll-to-bottom-button')

window.addEventListener("load", function(){
    load.style.display = 'none'
})

students.forEach(student => {
    student.addEventListener('click', () => {
        let detail = student.nextElementSibling
        if (detail.style.display === 'none') {
            details.forEach(detail => detail.style.display = 'none')
            detail.style.display = 'flex'
            
        } else {
            detail.style.display = 'none'
        }
    })
})
button.addEventListener("click", function() {
    var currentHeight = document.body.scrollHeight
    window.scrollTo(0, currentHeight)
})

var button = document.getElementById("scroll-to-bottom-button")
button.addEventListener("click", function() {
    window.scroll({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'smooth'
    })
})

function showHideButton() {
    var currentHeight = document.body.scrollHeight
    if (currentHeight > window.innerHeight) {
        button.style.display = "block"
    } else {
        button.style.display = "none"
    }
}
showHideButton()
window.addEventListener("resize", showHideButton)
