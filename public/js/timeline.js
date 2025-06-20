const tooltip = document.getElementById('custom-tooltip');

function renderTimeline(containerSelector, data) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = "";

    const totalMinutes = 1440; // 24 * 60

    let data_blocks = [];

    data.forEach(block => {
        const start = new Date(block.start_time && block.start_time.replace('Z', ''));
        const end = new Date(block.end_time && block.end_time.replace('Z', ''));

        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();

        const widthPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;

        if (widthPercent > 0) {
            data_blocks.push({
                status: block.status,
                start,
                end,
                duration_seconds: block.duration_seconds
            });
        }
    });

    for (let i = 1; i < data_blocks.length; i++) {
        if (data_blocks[i].status == data_blocks[i - 1].status) {
            data_blocks[i - 1].end = data_blocks[i].end;
            data_blocks[i - 1].duration_seconds += data_blocks[i].duration_seconds;

            data_blocks.splice(i, 1);
            i--;
        }
    }

    data_blocks.forEach(block => {
        const { start, end, status, duration_seconds } = block;
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();

        const leftPercent = (startMinutes / totalMinutes) * 100;
        const widthPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;

        const div = document.createElement("div");
        div.className = `timeline-block ${status}`;
        div.style.left = `${leftPercent}%`;
        div.style.width = `${widthPercent}%`;
        div.dataset.start = `${start.getHours()}:${start.getMinutes()}`;
        div.dataset.end = `${end.getHours()}:${end.getMinutes()}`;
        div.dataset.duration = `${Math.floor(duration_seconds / 3600)}h${Math.ceil((duration_seconds % 3600) / 60)}m`;

        addTooltipEventListener(div);
        container.appendChild(div);
    });
}

function createTimelineHTML(dateStr) {
    return `
        <div class="mb-3">
            <div class="timeline-date">${dateStr}</div>
            <div class="timeline-container" id="timeline-${dateStr.replaceAll('/', '')}"></div>
            <div class="timeline-hours d-flex justify-content-between mt-1">
                <span>0h</span><span>3h</span><span>6h</span><span>9h</span><span>12h</span>
                <span>15h</span><span>18h</span><span>21h</span><span>24h</span>
            </div>
        </div>
    `;
}

function createDateObject(dateStr) {
    let dateParts = dateStr.split("/");
    return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
}

function getLast5Dates(date = new Date()) {
    const dates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() - i);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateStr = `${day}/${month}`;
        const dateParam = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
        dates.push({ display: dateStr, param: dateParam });
    }
    return dates;
}

function loadLast5Timelines(machine_id, date) {
    const container = document.getElementById("multi-day-timelines");
    container.innerHTML = '';
    const dates = getLast5Dates(createDateObject(date));
    dates.forEach(({ display, param }) => {
        // 1. Tạo HTML dòng timeline
        container.innerHTML += createTimelineHTML(display);

        // 2. Gọi API và render timeline
        $.ajax({
            url: `/machine/api/machine-timeline`,
            method: "GET",
            data: { machine_id, date: param },
            dataType: "json",
            success: function (response) {
                renderTimeline(`#timeline-${display.replaceAll('/', '')}`, response.data);
            }
        });
    });
}

function addTooltipEventListener(block) {
    block.addEventListener('mousemove', (e) => {
        const start = block.getAttribute('data-start');
        const end = block.getAttribute('data-end');
        const duration = block.getAttribute('data-duration');

        tooltip.style.opacity = '1';
        tooltip.style.left = e.pageX + 15 + 'px';  // offset a bit right
        tooltip.style.top = e.pageY + 15 + 'px';   // offset a bit down

        tooltip.innerHTML = `
            <div><strong>${start} - ${end}</strong></div>
            <div><strong>Duration:</strong> ${duration}</div>
        `;
    });

    block.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });
}