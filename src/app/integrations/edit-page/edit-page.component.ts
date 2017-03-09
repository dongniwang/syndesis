import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Params, Router, UrlSegment } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { IntegrationStore } from '../../store/integration/integration.store';
import { Integration } from '../../model';
import { CurrentFlow, FlowEvent } from './current-flow.service';
import { log, getCategory } from '../../logging';

const category = getCategory('IntegrationsEditPage');

@Component({
  selector: 'ipaas-integrations-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: [ './edit-page.component.scss' ],
})
export class IntegrationsEditPage implements OnInit, OnDestroy {

  integration: Observable<Integration>;
  private readonly loading: Observable<boolean>;

  integrationSubscription: Subscription;
  routeSubscription: Subscription;
  childRouteSubscription: Subscription;
  flowSubscription: Subscription;
  urls: UrlSegment[];
  _canContinue = false;
  position: number;

  constructor( private currentFlow: CurrentFlow,
              private store: IntegrationStore,
              private route: ActivatedRoute,
              private router: Router ) {
    this.integration = this.store.resource;
    this.loading = this.store.loading;
  }


  finish() {
    const router = this.router;
    this.currentFlow.events.emit({
      kind: 'integration-save',
      action: (i: Integration) => {
        router.navigate([ '/integrations' ]);
      },
      error: (error) => {
        router.navigate([ '/integrations' ]);
      },
    });
  }

  continue() {
    const child = this.getCurrentChild();
    switch (child) {
      case 'action-select':
        this.router.navigate([ 'action-configure', this.position ], { relativeTo: this.route });
        break;
      case 'action-configure':
        // TODO hard-coding this to just go to the next action
        this.currentFlow.events.emit({
          kind: 'integration-action-configured',
          position: this.position,
        });
        this.router.navigate([ 'action-select', this.position + 1 ], { relativeTo: this.route });
        break;
      case 'connection-select':
        this.router.navigate([ 'action-select', this.position ], { relativeTo: this.route });
        break;
      case 'connection-configure':
        // TODO hard-coding this to just go to the next connection
        this.currentFlow.events.emit({
          kind: 'integration-connection-configured',
          position: this.position,
        });
        this.router.navigate([ 'connection-select', this.position + 1 ], { relativeTo: this.route });
        break;
      default:
        // who knows...
        break;
    }
  }

  getCurrentChild(): string {
    const child = this.route.firstChild;
    if (child && child.snapshot) {
      const path = child.snapshot.url;
      // log.debugc(() => 'path from root: ' + path, category);
      return path[ 0 ].path;
    } else {
      // log.debugc(() => 'no current child', category);
      return undefined;
    }
  }

  getCurrentPosition(): number {
    const child = this.route.firstChild;
    if (child && child.snapshot) {
      const path = child.snapshot.url;
      // log.debugc(() => 'path from root: ' + path, category);
      const position = path[1].path;
      if (position === 'new') {
        return undefined;
      } else {
        return +position;
      }
    } else {
      // log.debugc(() => 'no current child', category);
      return undefined;
    }
  }

  handleFlowEvent(event: FlowEvent) {
    const child = this.getCurrentChild();
    switch (event.kind) {
      case 'integration-updated':
        // no start connection set
        if (!this.currentFlow.getStartConnection()) {
          this.router.navigate(['connection-select', 0], { relativeTo: this.route });
          return;
        }
        // no end connection set
        if (!this.currentFlow.getEndConnection()) {
          this.router.navigate(['connection-select', this.currentFlow.getLastPosition()], { relativeTo: this.route });
          return;
        }
        // prompt the user what next?
        this.router.navigate(['save-or-add-step', 'new'], { relativeTo: this.route });
        break;
      case 'integration-no-actions':
        /*
        if (child !== 'action-select') {
          this.router.navigate(['action-select', 0], { relativeTo: this.route });
        }
        */
        break;
      case 'integration-no-connections':
        /*
        TODO disabling this for now so we can easily work on individual steps
        if (child !== 'connection-select') {
          this.router.navigate([ 'connection-select', 0 ], { relativeTo: this.route });
        }
        */
        break;
      case 'integration-action-select':
      case 'integration-connection-select':
        /*
        TODO we'll allow the next button all the time for now
        if (!this.currentFlow.integration.steps[this.position]) {
          this._canContinue = false;
        }
        */;
        break;
      case 'integration-selected-action':
        /*
        this.position = event[ 'position' ];
        this.currentFlow.events.emit({
          kind: 'integration-set-action',
          position: this.position,
          action: event[ 'action' ],
        });
        this._canContinue = true;
        this.continue();
        */
        break;
      case 'integration-selected-connection':
      /*
        this.position = event[ 'position' ];
        this.currentFlow.events.emit({
          kind: 'integration-set-connection',
          position: this.position,
          connection: event[ 'connection' ],
        });
        this._canContinue = true;
        this.continue();
        */
        break;
      case 'integration-action-configure':
      case 'integration-connection-configure':
        break;
    }
  }

  ngOnInit() {
    this.flowSubscription = this.currentFlow.events.subscribe((event: FlowEvent) => {
      this.handleFlowEvent(event);
    });
    this.integrationSubscription = this.integration.subscribe((i: Integration) => {
      this.currentFlow.integration = i;
    });
    this.routeSubscription = this.route.params.pluck<Params, string>('integrationId')
      .map((integrationId: string) => this.store.loadOrCreate(integrationId))
      .subscribe();
    $.fn.setupVerticalNavigation ? $.fn.setupVerticalNavigation().hideMenu() : '';
  }

  ngOnDestroy() {
    this.integrationSubscription.unsubscribe();
    this.routeSubscription.unsubscribe();
    this.flowSubscription.unsubscribe();
    $.fn.setupVerticalNavigation ? $.fn.setupVerticalNavigation().showMenu() : '';
  }

}