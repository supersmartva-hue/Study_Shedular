/**
 * Unified display types for the TaskFlow glassmorphism widget.
 * Both the public (localStorage) page and the authenticated (API) page
 * adapt their native data models to these types before passing to TaskFlowUI.
 */

/** A task as the TaskFlow widget understands it */
export interface TFTask {
  id:           string;
  title:        string;
  description?: string;
  done:         boolean;
  priority:     1 | 2 | 3;    // 1=Low  2=Medium  3=High
  dueDate?:     string;        // ISO datetime string or YYYY-MM-DD
  source?:      'manual' | 'study_sync' | 'extension';
  tags?:        string[];
}

/** Payload emitted by the quick-add form */
export interface TFAddInput {
  title:    string;
  priority: 1 | 2 | 3;
  dueDate?: string;            // YYYY-MM-DD
}

/** Filter options shown in the filter tab row */
export type TFFilter = 'all' | 'today' | 'upcoming' | 'active' | 'done';

/** Stats passed into or computed by the widget */
export interface TFStats {
  total:    number;
  active:   number;  // not done
  today:    number;  // due today + not done
  done:     number;
}
