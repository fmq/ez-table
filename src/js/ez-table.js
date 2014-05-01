/*jshint -W043 */
angular.module('ez.table', [])

.constant('EzTableConfig', {
    limit: 10,
    limits: [5, 10, 25, 100],
    sortField: null,
    sortAscending: false,
    // FMQ - Added global search
    globalSearchField: undefined,
    // FMQ - Added show batch
    showBatchActions: false,
})

.directive('ezTable', ['$filter', '$timeout', 'EzTableConfig',
    function ($filter, $timeout, EzTableConfig) {
        return {
            restrict: 'A',
            scope: true,
            compile: function (element) {

                // create header template
                var headerTpl = '<thead><tr>',
                    filterTpl = '<tr ng-show="showFilters"><th></th>',
                    cols = element.find('tbody tr:first-child td'),
                    ColName,
                    colName,
                    fieldName;

                // FMQ = Added conditional display based on showBatchActions
                headerTpl += '<th><input class="batch-checkbox" type="checkbox" ng-model="isToggled" ng-change="toggleAll()" ng-show="showBatchActions" /></th>';

                for (var i = 1; i < cols.length - 1; i++) {
                    ColName = angular.element(cols[i]).data('title');

                    if (!ColName) {
                        throw new Error('data-title attribute must be specified for column "' + i + '"');
                    }

                    colName = ColName.charAt(0).toLowerCase() + ColName.slice(1);
                    fieldName = angular.element(cols[i]).data('field') || colName;
                    // FMQ -  MOdified for look and feel.
                    headerTpl += '<th class="sorting" ng-class="{\'sorting_asc\': !sortAscending && sortField == \'' + fieldName +
                                    '\', \'sorting_desc\': sortAscending && sortField == \'' + fieldName + '\'} " ><a ng-click="sort(\'' + fieldName +
                                    '\')">' + ColName + '<span ng-show="sortField == \'' + colName + '\'" ></span></a></th>';

                    filterTpl += '<th><input class="form-control" ng-model="filters.' + fieldName + '" type="text" ng-change="filter(\'' + fieldName + '\')"/></th>';
                }

                headerTpl += '<th></th></tr>';
                filterTpl += '<th></th></tr>';

                headerTpl += filterTpl + '</thead>';

                element.prepend(headerTpl);

                // create footer template
                var footerTpl = '<tfoot><tr> \
                    <tr> \
                     <td colspan="100%"> \
                        <div class="row" > \
                            <div class="limit-selector col-md-6"> \
                                <a ng-click="pager.setRowsPerPage(10)" ng-class="{active: limit == 10}" >10</a><span>|</span> \
                                <a ng-click="pager.setRowsPerPage(25)" ng-class="{active: limit == 25}" >25</a><span>|</span> \
                                <a ng-click="pager.setRowsPerPage(50)" ng-class="{active: limit == 50}" >50</a> \
                            </div> \
                            <div class="col-md-6 dataTables_paginate paging_bootstrap"> \
                                <div class="dataTables_paginate paging_bootstrap"> \
                                    <!-- pagination --> \
                                    <ul class="pagination pagination-sm" ng-show="pager.totalPages > 0" > \
                                        <li ng-class="{disabled: pager.currentPage == 1}"> \
                                            <a ng-click="prev()" ><i class="fa fa-chevron-left"></i></a> \
                                        </li> \
                                        <li ng-repeat="page in pager.pages" class="" ng-class="{active: pager.currentPage === page, inactive: pager.currentPage !== page}"> \
                                            <a ng-click="setPage(page -1)"> \
                                                {{page }} \
                                            </a> \
                                        </li> \
                                        <li ng-class="{disabled: pager.currentPage == pager.totalPages}"> \
                                            <a ng-click="next()" ><i class="fa fa-chevron-right"></i></a> \
                                        </li> \
                                    </ul>\
                                </div> \
                            </div> \
                        </div> \
                        <a ng-hide="true" class="filter-toggle btn btn-sm btn-default" ng-click="showFilters = !showFilters" title="Toggle Filters"><i class="icon-search"></i><span>Search</span></a> \
                    </td>  \
                    </tr> \
                </tfoot>';

                element.append(footerTpl);

                // attach table classes
                element.addClass('table ez-table table-striped table-hover table-full-width dataTable ');

                // link function
                return function (scope, element, attrs) {
                    scope.limit = parseInt(attrs.limit, 10) || EzTableConfig.limit;
                    scope.limits = scope.$eval(attrs.limits) || EzTableConfig.limits;
                    scope.sortField = scope.$eval(attrs.sortField) || EzTableConfig.sortField;
                    scope.sortAscending = scope.$eval(attrs.sortAscending) || EzTableConfig.sortAscending;
                    // FMQ - Added show batch field
                    scope.showBatchActions = scope.$eval(attrs.showBatchActions) || EzTableConfig.showBatchActions;
                    // FMQ - Added global search field
                    var globalSearchField = scope.$eval(attrs.globalSearch) || EzTableConfig.globalSearchField;
                    // FMQ - Pager implementations -
                    // TODO -> Move to a directive..
                    scope.pager = {};
                    scope.pager.currentPage = 1;
                    scope.pager.maxPages = 7;
                    scope.pager.rowsPerPage = scope.limit;

                    scope.pager.setPage = function (pageNum) {
                        if (pageNum) {
                            scope.pager.currentPage = parseInt(pageNum);
                        }

                        if (scope.pager.maxPages < scope.pager.totalPages) {
                            var startPage = Math.max(scope.pager.currentPage - Math.floor(scope.pager.maxPages/2), 1);
                            var endPage   = startPage + scope.pager.maxPages - 1;

                            // Adjust if limit is exceeded
                            if (endPage > scope.pager.totalPages) {
                              endPage   = scope.pager.totalPages;
                              startPage = endPage - scope.pager.maxPages + 1;
                            }

                            scope.pager.pages = [];
                            for (startPage; startPage <= endPage ; startPage++) {
                                scope.pager.pages.push(startPage);
                            }
                        }
                    };

                    scope.pager.next = function () {
                        if (scope.pager.currentPage < scope.pager.totalPages) {
                            scope.pager.setPage(++scope.pager.currentPage);
                        }
                        return scope.pager.currentPage;

                    };

                    scope.pager.prev = function () {
                        if (scope.pager.currentPage > 1) {
                            scope.pager.setPage(--scope.pager.currentPage);
                        }
                        return scope.pager.currentPage;
                    };

                    scope.pager.refresh = function(data) {

                        scope.pager.totalRows = data.length;
                        scope.pager.totalPages = Math.ceil(data.length / scope.pager.rowsPerPage);
                        // Inicializo el paginadr
                        var startPage = parseInt(1);
                        var endPage = scope.pager.totalPages < scope.pager.maxPages ? scope.pager.totalPages : scope.pager.maxPages;
                        scope.pager.pages = [];

                        for (startPage; startPage <= endPage ; startPage++) {
                            scope.pager.pages.push(startPage);
                        }
                    };

                    scope.pager.setRowsPerPage = function (rows) {
                        scope.limit = rows;
                        scope.setPage(0);
                    };
                    // END PAGER

                    scope.currentPage = 0;
                    scope.batchAction = '';
                    scope.filters = {};

                    scope.setPage = function (page) {
                        scope.currentPage = page;
                        scope.items = scope.pages[page];
                        // FMQ - Set pager selected page
                        scope.pager.setPage(page +1);
                    };

                    scope.calcPages = function (page) {
                        var items = [];

                        for (var hasFilters in scope.filters) {
                            break;
                        }

                        if (scope.sortField) {
                            items = $filter('orderBy')(scope.$eval(attrs.ezTable), scope.sortField, !scope.sortAscending);
                        } else {
                            items = scope.$eval(attrs.ezTable);
                        }

                        if (hasFilters) {
                            items = $filter('filter')(items, scope.filters);
                        }

                        if (globalSearchField) {
                            items = $filter('filter')(items, { '$' : globalSearchField });
                        }

                        scope.pageCount = items.length / scope.limit;
                        scope.pages = [];
                        for (var i = 0; i < scope.pageCount; i++) {
                            scope.pages[i] = items.slice(i * scope.limit, ((i * scope.limit) + scope.limit));
                        }
                        // FMQ - Refresh tha pager count
                        scope.pager.refresh(items);

                        scope.setPage(page);

                    };

                    scope.toggleAll = function () {
                        angular.forEach(scope.items, function (item, i) {
                            scope.items[i]._selected = scope.isToggled;
                        });
                    };

                    scope.prev = function () {

                            scope.items = scope.pages[scope.pager.prev() -1];
                            scope.isToggled = false;

                    };

                    scope.next = function () {

                        scope.items = scope.pages[scope.pager.next() -1];
                        scope.isToggled = false;

                    };

                    scope.sort = function (name) {
                        scope.sortAscending = !scope.sortAscending;
                        scope.sortField = name;
                        scope.calcPages(scope.currentPage);
                    };

                    scope.filter = function () {
                        scope.calcPages(0);
                    };

                    scope.$watch('limit', function (newVal, oldVal) {
                        if (newVal !== oldVal) {
                            scope.calcPages(0);
                        }
                    });

                    scope.$watch(attrs.ezTable, function (items) {
                        scope.showBatchActions = false;

                        if (items) {
                            var count = items.length;
                            angular.forEach(items, function (item, i) {
                                if (item._selected) {
                                    scope.showBatchActions = true;

                                    return;
                                } else if ((i + 1) === count) {
                                    scope.isToggled = false;
                                }
                            });

                            scope.calcPages(scope.pager.currentPage -1);
                        }
                    }, true);

                    // FMQ - Global search wtch
                    scope.$watch(attrs.globalSearch, function(newVal, oldVal) {
                        if(newVal !== oldVal) {
                             $timeout(function() {
                                 globalSearchField = newVal;
                                 scope.filter();
                            }, 300);
                        }
                    });
                };
            }
        };
}]);
