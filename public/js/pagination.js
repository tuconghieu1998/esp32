function createPageItem(page, currentPage) {
    return `<li class="page-item ${page == currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${page}">${page}</a>
    </li>`;
}

function createPageNumber(pageId, currentPage, totalPages) {
    const pagination = $("#" + pageId); // Ensure #pagination exists
    pagination.empty();

    // Previous Button
    if (currentPage > 1) {
        pagination.append(`<li class="page-item">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>`);
    }

    // First Page
    pagination.append(createPageItem(1, currentPage));

    // Left Ellipsis (if needed)
    if (currentPage > 4) {
        pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
    }

    // Page Numbers Around Current
    const startPage = Math.max(2, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        pagination.append(createPageItem(i, currentPage));
    }

    // Right Ellipsis (if needed)
    if (currentPage < totalPages - 3) {
        pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
    }

    // Last Page
    if (totalPages > 1) {
        pagination.append(createPageItem(totalPages, currentPage));
    }

    // Next Button
    if (currentPage < totalPages) {
        pagination.append(`<li class="page-item">
       <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
       </li>`);
    }

    // Add "Go to Page" Input
    pagination.append(`
        <li class="page-item">
            <input type="number" id="gotoPage" min="1" max="${totalPages}" class="form-control" 
                   placeholder="Page" style="width: 80px; margin-left: 20px; display: inline-block; text-align: center;">
        </li>
    `);
}