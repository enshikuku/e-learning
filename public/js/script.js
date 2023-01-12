const load = document.querySelector(".loader")
window.addEventListener("load", function(){
    load.style.display = 'none'
})

let students = document.querySelectorAll('.studentidandname')
let details = document.querySelectorAll('.studentdetailedinformation')

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