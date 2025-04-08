function insertData(value) {
    let div = document.getElementById('insert-block');
    div.innerHTML = "<a href = '"+value+"'>testLink</a>";
}

function handleClick() {
    console.log('sdf');
    let text = document.getElementById('text').value;
    insertData(text);
}