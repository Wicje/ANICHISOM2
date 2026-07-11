use crate::event_store::Event;

pub struct Projection {
    pub name: String,
}

impl Projection {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
        }
    }

    pub fn apply(&self, state: &mut serde_json::Value, event: &Event) {
        match self.name.as_str() {
            "workspace" => self.apply_workspace(state, event),
            "user" => self.apply_user(state, event),
            _ => {}
        }
    }

    fn apply_workspace(&self, state: &mut serde_json::Value, event: &Event) {
        if let Some(obj) = state.as_object_mut() {
            match event.event_type.as_str() {
                "workspace.created" => {
                    obj.insert(event.aggregate_id.clone(), event.payload.clone());
                }
                "workspace.updated" => {
                    if let Some(workspace) = obj.get_mut(&event.aggregate_id) {
                        if let (Some(ws_obj), Some(update)) =
                            (workspace.as_object_mut(), event.payload.as_object())
                        {
                            for (k, v) in update {
                                ws_obj.insert(k.clone(), v.clone());
                            }
                        }
                    }
                }
                "workspace.deleted" => {
                    obj.remove(&event.aggregate_id);
                }
                _ => {}
            }
        }
    }

    fn apply_user(&self, state: &mut serde_json::Value, event: &Event) {
        if let Some(obj) = state.as_object_mut() {
            match event.event_type.as_str() {
                "user.registered" => {
                    obj.insert(event.aggregate_id.clone(), event.payload.clone());
                }
                "user.updated" => {
                    if let Some(user) = obj.get_mut(&event.aggregate_id) {
                        if let (Some(user_obj), Some(update)) =
                            (user.as_object_mut(), event.payload.as_object())
                        {
                            for (k, v) in update {
                                user_obj.insert(k.clone(), v.clone());
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }
}
