const load = document.querySelector(".loader")
let students = document.querySelectorAll('.studentidandname')
let details = document.querySelectorAll('.studentdetailedinformation')

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