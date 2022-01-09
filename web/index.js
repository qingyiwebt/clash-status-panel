(async() => {
    let tableBody = $('#table_body');
    let nodes = (await axios('/api/nodes')).data;
    tableBody.html(nodes.map(
        item => `<tr>
        <td>${item}</td>
        <td class="col-available" data-name="${item}">Loading...</td>
        <td class="col-latency" data-name="${item}"></td>
        </tr>`
    ).join(''));
    nodes.forEach(async(item) => {
        let info = await axios('/api/node/' + encodeURI(item));
        let latency = info.data.delay;
        $(`.col-available[data-name="${item}"]`).text(latency ? 'Available' : 'Unavailable');
        if (latency) {
            $(`.col-latency[data-name="${item}"]`).text(latency + 'ms');
        }
    });
})();